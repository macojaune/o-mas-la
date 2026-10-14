import type { Metadata } from "next"

import { env } from "@oyo/auth/env"

import { LoginForm } from "./login-form"

export const metadata: Metadata = {
  title: "Connexion — O Mas La ?",
  robots: { index: false, follow: false },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const params = await searchParams
  let callbackUrl = "/map"
  if (env.AUTH_ISSUER_URL && typeof params.callbackUrl === "string") {
    try {
      const target = new URL(params.callbackUrl, env.AUTH_ISSUER_URL)
      if (
        target.origin === new URL(env.AUTH_ISSUER_URL).origin &&
        !target.pathname.startsWith("/api/auth") &&
        !target.pathname.startsWith("/login")
      )
        callbackUrl = `${target.pathname}${target.search}${target.hash}`
    } catch {
      /* Invalid destinations return to the public map. */
    }
  }
  return <LoginForm callbackUrl={callbackUrl} error={params.error} />
}
