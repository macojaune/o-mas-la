import NextAuth from "next-auth"

import { authConfig } from "./config"
import { revokeBrowserSession } from "./web-session"

export type { Session } from "next-auth"

const { handlers, auth, signIn, signOut: defaultSignOut } = NextAuth(authConfig)

async function signOut<R extends boolean = true>(options?: {
  redirectTo?: string
  redirect?: R
}) {
  await revokeBrowserSession()
  return defaultSignOut(options)
}

export { handlers, auth, signIn, signOut }

export {
  invalidateSessionToken,
  validateToken,
  isSecureContext,
} from "./config"
