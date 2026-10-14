import type {
  DefaultSession,
  NextAuthConfig,
  Session as NextAuthSession,
} from "next-auth"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import Apple from "next-auth/providers/apple"
import Google from "next-auth/providers/google"

import { and, eq, lt, sql } from "@oyo/db"
import { db } from "@oyo/db/client"
import { Account, Session, User, VerificationToken } from "@oyo/db/schema"

import { env } from "../env"
import { allowEmailSend, emailProvider, normalizeEmail } from "./email"
import { bearerSession } from "./native-protocol"
import { authRequestContext } from "./request-context"
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
  verificationTokensTable: VerificationToken,
})

adapter.getUserByEmail = async (email) =>
  (await db
    .select()
    .from(User)
    .where(sql`lower(${User.email}) = ${normalizeEmail(email)}`)
    .get()) ?? null

adapter.createVerificationToken = async (data) => {
  await db
    .delete(VerificationToken)
    .where(lt(VerificationToken.expires, new Date()))
  return db
    .insert(VerificationToken)
    .values({
      ...data,
      nativeGrantId: authRequestContext.getStore()?.nativeGrantId ?? null,
    })
    .returning()
    .get()
}
adapter.useVerificationToken = async ({ identifier, token }) => {
  // DELETE RETURNING is the single-use boundary, including concurrent callbacks.
  const result = await db
    .delete(VerificationToken)
    .where(
      and(
        eq(VerificationToken.identifier, identifier),
        eq(VerificationToken.token, token),
      ),
    )
    .returning()
    .get()
  const context = authRequestContext.getStore()
  if (context) context.usedNativeGrantId = result?.nativeGrantId ?? null
  return result ?? null
}

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

export const isSecureContext =
  env.AUTH_ISSUER_URL?.startsWith("https://") === true ||
  env.NODE_ENV !== "development"

export const authConfig = {
  adapter,
  session: { strategy: "database" },
  // Auth.js rewrites HTTP and server-action origins from this validated AUTH_URL.
  // Never infer a production callback or email link from forwarded host headers.
  trustHost: !!env.AUTH_URL || env.NODE_ENV === "development",
  secret: env.AUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/login/check-email",
  },
  providers: [
    ...(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: env.AUTH_GOOGLE_ID,
            clientSecret: env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
    ...(env.AUTH_APPLE_ID && env.AUTH_APPLE_SECRET
      ? [
          Apple({
            clientId: env.AUTH_APPLE_ID,
            clientSecret: env.AUTH_APPLE_SECRET,
          }),
        ]
      : []),
    ...(env.AUTH_BREVO_API_KEY && env.AUTH_EMAIL_FROM ? [emailProvider()] : []),
  ],
  callbacks: {
    signIn: async ({ account, profile, email, user }) => {
      // Auth.js calls this before sending OR storing a verification token.
      // Limiting only sendVerificationRequest would still create refused tokens.
      if (email?.verificationRequest)
        return !!user.email && (await allowEmailSend(user.email))
      // OIDC signatures are checked by Auth.js; require provider-verified email
      // too. Never enable allowDangerousEmailAccountLinking.
      const verified = (profile as Record<string, unknown> | undefined)
        ?.email_verified
      if (account?.provider === "google") return verified === true
      if (account?.provider === "apple")
        return verified === true || verified === "true"
      return true
    },
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
