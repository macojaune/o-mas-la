"use client"

import { useCallback } from "react"
import { getCsrfToken, useSession } from "next-auth/react"

export async function safeSignOut(redirectTo = "/map") {
  const target = new URL(redirectTo, window.location.origin)
  if (target.origin !== window.location.origin)
    throw new Error("Invalid logout destination")
  const csrfToken = await getCsrfToken()
  const response = await fetch("/api/auth/signout", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1",
    },
    body: new URLSearchParams({ csrfToken, callbackUrl: target.href }),
    credentials: "same-origin",
  })
  if (!response.ok)
    throw new Error(
      "Déconnexion non confirmée. Rétablis la connexion et réessaie.",
    )
  window.location.assign(target.href)
}

export function useConvexAuth() {
  const { status } = useSession()
  const fetchAccessToken = useCallback(async () => {
    if (status !== "authenticated") return null
    const response = await fetch("/api/auth/convex-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      credentials: "same-origin",
      cache: "no-store",
    })
    if (response.status === 401) return null
    if (!response.ok) throw new Error("Authentication temporarily unavailable")
    const data = (await response.json()) as { token?: unknown }
    return typeof data.token === "string" ? data.token : null
  }, [status])
  return {
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    fetchAccessToken,
  }
}
