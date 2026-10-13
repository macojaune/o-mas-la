import type {
  DefaultSession,
  NextAuthConfig,
  Session as NextAuthSession,
} from "next-auth"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import Discord from "next-auth/providers/discord"

import { db } from "@oyo/db/client"
import { Account, Session, User } from "@oyo/db/schema"

import { env } from "../env"
import { bearerSession } from "./native-protocol"
import { verifiedSession } from "./session-policy"
import { revokeConvexSession } from "./tokens"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}

const adapter = DrizzleAdapter(db, {
  usersTable: User,
  accountsTable: Account,
  sessionsTable: Session,
})

const deleteDatabaseSession = adapter.deleteSession?.bind(adapter)
adapter.deleteSession = async (sessionToken) => {
  const current = await adapter.getSessionAndUser?.(sessionToken)
  if (current && current.session.expires.getTime() > Date.now()) {
    await revokeConvexSession(
      {
        user: { id: current.user.id },
        expires: current.session.expires.toISOString(),
      },
      sessionToken,
    )
  }
  // A failed backend revocation must not be reported as a successful logout.
  await deleteDatabaseSession?.(sessionToken)
}

export const isSecureContext = env.NODE_ENV !== "development"

export const authConfig = {
  adapter,
  session: { strategy: "database" },
  // OAuth state/PKCE and Auth.js CSRF checks remain enabled in development too.
  ...(!isSecureContext
    ? {
        trustHost: true,
      }
    : {}),
  secret: env.AUTH_SECRET,
  providers:
    env.AUTH_DISCORD_ID && env.AUTH_DISCORD_SECRET
      ? [
          Discord({
            clientId: env.AUTH_DISCORD_ID,
            clientSecret: env.AUTH_DISCORD_SECRET,
          }),
        ]
      : [],
  callbacks: {
    session: (opts) => {
      if (!("user" in opts))
        throw new Error("unreachable with session strategy")

      return {
        ...opts.session,
        user: {
          ...opts.session.user,
          id: opts.user.id,
        },
      }
    },
  },
} satisfies NextAuthConfig

export const validateToken = async (
  token: string,
): Promise<NextAuthSession | null> => {
  const session = await verifiedSession(token, async (sessionToken) =>
    adapter.getSessionAndUser?.(sessionToken),
  )
  return session
    ? {
        user: {
          ...session.user,
        },
        expires: session.session.expires.toISOString(),
      }
    : null
}

export const invalidateSessionToken = async (token: string) => {
  const sessionToken = bearerSession(token)
  if (!sessionToken) throw new Error("Invalid session authorization")
  await adapter.deleteSession?.(sessionToken)
}
