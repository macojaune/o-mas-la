import * as Crypto from "expo-crypto"
import * as Browser from "expo-web-browser"

import { getBaseUrl } from "./base-url"
import {
  clearLogoutPending,
  clearPendingAuth,
  deleteToken,
  getPendingAuth,
  getToken,
  isLogoutPending,
  markLogoutPending,
  setPendingAuth,
  setToken,
} from "./session-store"

export interface NativeUser {
  id: string
  name: string | null
}

interface AccessResponse {
  token: string
  expiresAt: number
  user: NativeUser
}

const redirectUri = "omasla://login"
let generation = 0
let loggingOut = false
let access: AccessResponse | null = null
let inFlight: Promise<AccessResponse | null> | null = null
let completionFlight: Promise<boolean> | null = null
let signInFlight: Promise<boolean> | null = null

function logoutPending() {
  return loggingOut || isLogoutPending()
}

function parseAccess(value: unknown): AccessResponse {
  if (!value || typeof value !== "object")
    throw new Error("Réponse de connexion invalide.")
  const data = value as Partial<AccessResponse>
  if (
    typeof data.token !== "string" ||
    typeof data.expiresAt !== "number" ||
    !data.user ||
    typeof data.user.id !== "string" ||
    !(data.user.name === null || typeof data.user.name === "string")
  ) {
    throw new Error("Réponse de connexion invalide.")
  }
  return data as AccessResponse
}

export function currentUser() {
  return access?.user ?? null
}

export async function fetchConvexAccessToken(options?: {
  forceRefreshToken?: boolean
}): Promise<string | null> {
  if (logoutPending()) return null
  if (
    !options?.forceRefreshToken &&
    access &&
    access.expiresAt > Date.now() + 10_000
  )
    return access.token
  const requestGeneration = generation
  if (!inFlight) {
    inFlight = (async () => {
      const session = getToken()
      if (!session) return null
      const response = await fetch(`${getBaseUrl()}/api/auth/convex-token`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      })
      if (requestGeneration !== generation || logoutPending()) return null
      if (response.status === 401) {
        await deleteToken()
        access = null
        return null
      }
      if (!response.ok)
        throw new Error("Connexion temporairement indisponible.")
      const data = parseAccess(await response.json())
      if (requestGeneration !== generation || logoutPending()) return null
      access = data
      return data
    })().finally(() => {
      inFlight = null
    })
  }
  return (await inFlight)?.token ?? null
}

export function nativeSignIn() {
  signInFlight ??= beginNativeSignIn().finally(() => {
    signInFlight = null
  })
  return signInFlight
}

async function beginNativeSignIn() {
  // Capture the user's intention before even the first microtask yield.
  let signInGeneration = generation
  if (logoutPending()) {
    signInGeneration += 1
    await nativeSignOut()
  }
  if (generation !== signInGeneration || logoutPending()) return false
  await completionFlight?.catch(() => false)
  if (generation !== signInGeneration || logoutPending()) return false
  const verifier = Array.from(await Crypto.getRandomBytesAsync(32), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")
  const state = Array.from(await Crypto.getRandomBytesAsync(24), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")
  const challenge = (
    await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      verifier,
      { encoding: Crypto.CryptoEncoding.BASE64 },
    )
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
  const signInUrl = new URL(`${getBaseUrl()}/api/auth/signin`)
  signInUrl.searchParams.set("native_redirect", redirectUri)
  signInUrl.searchParams.set("code_challenge", challenge)
  signInUrl.searchParams.set("state", state)
  if (generation !== signInGeneration || logoutPending()) return false
  setPendingAuth(
    JSON.stringify({
      verifier,
      state,
      origin: getBaseUrl(),
      expiresAt: Date.now() + 15 * 60_000,
    }),
  )
  const result = await Browser.openAuthSessionAsync(
    signInUrl.toString(),
    redirectUri,
  )
  if (result.type !== "success") return false
  if (generation !== signInGeneration || logoutPending()) return false
  return completeNativeSignIn(result.url)
}

// Both WebBrowser's return and Linking's cold/warm starts use one exchange.
// The verifier is persisted only in SecureStore, never in the email or deep link.
export async function completeNativeSignIn(url: string) {
  if (logoutPending()) return false
  let callback: URL
  try {
    callback = new URL(url)
  } catch {
    return false
  }
  if (
    `${callback.protocol}//${callback.host}${callback.pathname}` !== redirectUri
  )
    return false
  const raw = getPendingAuth()
  let pending: {
    verifier?: unknown
    state?: unknown
    origin?: unknown
    expiresAt?: unknown
  }
  try {
    pending = raw ? (JSON.parse(raw) as typeof pending) : {}
  } catch {
    pending = {}
  }
  if (
    typeof pending.verifier !== "string" ||
    !/^[A-Za-z0-9._~-]{43,128}$/.test(pending.verifier) ||
    typeof pending.state !== "string" ||
    callback.searchParams.get("state") !== pending.state ||
    callback.searchParams.getAll("state").length !== 1 ||
    callback.searchParams.getAll("code").length !== 1 ||
    !/^[A-Za-z0-9_-]{43}$/.test(callback.searchParams.get("code") ?? "") ||
    pending.origin !== getBaseUrl() ||
    typeof pending.expiresAt !== "number" ||
    pending.expiresAt <= Date.now()
  ) {
    throw new Error(
      "Ce retour de connexion a expiré ou n’a pas été demandé sur ce téléphone.",
    )
  }
  if (completionFlight) return completionFlight
  const requestGeneration = generation
  const verifier = pending.verifier
  completionFlight = (async () => {
    const response = await fetch(`${getBaseUrl()}/api/auth/native/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: callback.searchParams.get("code"),
        verifier,
      }),
    })
    if (!response.ok)
      throw new Error("Cette connexion a expiré. Recommence la connexion.")
    const data = (await response.json()) as { sessionToken?: unknown }
    if (typeof data.sessionToken !== "string" || data.sessionToken.length < 20)
      throw new Error("Connexion invalide.")
    if (
      generation !== requestGeneration ||
      logoutPending() ||
      getPendingAuth() !== raw
    )
      return false
    // Finish an older credential read/delete before installing the new session.
    await inFlight?.catch(() => null)
    if (
      generation !== requestGeneration ||
      logoutPending() ||
      getPendingAuth() !== raw
    )
      return false
    generation += 1
    access = null
    setToken(data.sessionToken)
    await clearPendingAuth()
    await fetchConvexAccessToken({ forceRefreshToken: true })
    return true
  })().finally(() => {
    completionFlight = null
  })
  return completionFlight
}

export async function nativeSignOut() {
  generation += 1
  loggingOut = true
  markLogoutPending()
  await clearPendingAuth()
  access = null
  const session = getToken()
  if (session) {
    const response = await fetch(`${getBaseUrl()}/api/auth/native/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session}` },
    })
    if (!response.ok)
      throw new Error(
        "Déconnexion serveur en attente. Rétablis le réseau et réessaie.",
      )
  }
  // On network failure the marker and credential remain only for a retry.
  await deleteToken()
  await clearLogoutPending()
  loggingOut = false
}
