import { ConvexHttpClient } from "convex/browser"
import { makeFunctionReference } from "convex/server"
import { exportJWK, importPKCS8, SignJWT } from "jose"

import { env } from "../env"

export const CONVEX_AUDIENCE = "omasla-convex"
export const ACCESS_TOKEN_SECONDS = 60

function signingConfig() {
  if (
    !env.AUTH_JWT_PRIVATE_KEY ||
    !env.AUTH_JWT_KEY_ID ||
    !env.AUTH_ISSUER_URL
  ) {
    throw new Error("Auth signing configuration is missing")
  }
  const issuer = new URL(env.AUTH_ISSUER_URL)
  if (
    issuer.origin !== env.AUTH_ISSUER_URL ||
    (issuer.protocol !== "https:" &&
      !(env.NODE_ENV === "development" && issuer.hostname === "localhost"))
  ) {
    throw new Error(
      "AUTH_ISSUER_URL must be an HTTPS origin (localhost allowed in development)",
    )
  }
  return {
    issuer: env.AUTH_ISSUER_URL,
    kid: env.AUTH_JWT_KEY_ID,
    pem: env.AUTH_JWT_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }
}

export async function sessionId(sessionToken: string): Promise<string> {
  const hash = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(sessionToken),
    ),
  )
  return Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export async function issueAccessToken(
  session: { user: { id: string; name?: string | null }; expires: string },
  sessionToken: string,
) {
  const expiresAt = new Date(session.expires).getTime()
  const now = Math.floor(Date.now() / 1000)
  const expires = Math.min(
    now + ACCESS_TOKEN_SECONDS,
    Math.floor(expiresAt / 1000),
  )
  if (!Number.isFinite(expires) || expires <= now)
    throw new Error("Session expired")
  const config = signingConfig()
  const privateKey = await importPKCS8(config.pem, "RS256")
  const token = await new SignJWT({
    sid: await sessionId(sessionToken),
    sessionExpiresAt: expiresAt,
    ...(session.user.name ? { name: session.user.name } : {}),
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: config.kid })
    .setIssuer(config.issuer)
    .setAudience(CONVEX_AUDIENCE)
    .setSubject(session.user.id)
    .setIssuedAt(now)
    .setExpirationTime(expires)
    .sign(privateKey)
  return { token, expiresAt: expires * 1000 }
}

export async function publicJwks() {
  const config = signingConfig()
  const key = await importPKCS8(config.pem, "RS256", { extractable: true })
  const jwk = await exportJWK(key)
  // Never return the private exponent or prime factors exported from a private key.
  return {
    keys: [
      {
        kty: "RSA",
        n: jwk.n,
        e: jwk.e,
        kid: config.kid,
        alg: "RS256",
        use: "sig",
      },
    ],
  }
}

export async function revokeConvexSession(
  session: { user: { id: string }; expires: string },
  sessionToken: string,
) {
  if (new Date(session.expires).getTime() <= Date.now()) return
  if (!env.CONVEX_URL)
    throw new Error("CONVEX_URL is required to revoke a session")
  const { token } = await issueAccessToken(session, sessionToken)
  const client = new ConvexHttpClient(env.CONVEX_URL)
  client.setAuth(token)
  await client.mutation(
    makeFunctionReference<"mutation">("authSessions:revokeCurrentSession"),
    {},
  )
}
