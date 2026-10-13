import { cache } from "react"
import NextAuth from "next-auth"

import { authConfig } from "./config"
import { revokeBrowserSession } from "./web-session"

export type { Session } from "next-auth"

const {
  handlers,
  auth: defaultAuth,
  signIn,
  signOut: defaultSignOut,
} = NextAuth(authConfig)

async function signOut<R extends boolean = true>(options?: {
  redirectTo?: string
  redirect?: R
}) {
  await revokeBrowserSession()
  return defaultSignOut(options)
}

/**
 * This is the main way to get session data for your RSCs.
 * This will de-duplicate all calls to next-auth's default `auth()` function and only call it once per request
 */
const auth = cache(defaultAuth)

export { handlers, auth, signIn, signOut }

export {
  invalidateSessionToken,
  validateToken,
  isSecureContext,
} from "./config"
