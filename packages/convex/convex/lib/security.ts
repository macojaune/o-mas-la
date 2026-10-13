import { ConvexError } from "convex/values"

import type { Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"

type ReadContext = Pick<QueryCtx, "auth" | "db">
export function fail(code: string): never {
  throw new ConvexError({ code })
}

export async function identityClaims(ctx: Pick<QueryCtx, "auth">) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return fail("AUTH_REQUIRED")
  const { sid, sessionExpiresAt } = identity
  if (
    typeof sid !== "string" ||
    !/^[a-f0-9]{64}$/.test(sid) ||
    typeof sessionExpiresAt !== "number" ||
    !Number.isFinite(sessionExpiresAt)
  )
    return fail("AUTH_INVALID")
  if (sessionExpiresAt <= Date.now()) return fail("AUTH_EXPIRED")
  return { identity, sid, expiresAt: sessionExpiresAt }
}
export async function authenticate(ctx: ReadContext) {
  const claims = await identityClaims(ctx)
  const session = await ctx.db
    .query("authSessions")
    .withIndex("by_sid", (q) => q.eq("sid", claims.sid))
    .unique()
  if (
    session &&
    (session.revokedAt !== undefined ||
      session.expiresAt <= Date.now() ||
      session.subject !== claims.identity.subject ||
      session.issuer !== claims.identity.issuer)
  )
    return fail("AUTH_REVOKED")
  return claims
}
export async function findAccount(ctx: ReadContext) {
  const claims = await authenticate(ctx)
  const account = await ctx.db
    .query("accounts")
    .withIndex("by_identity", (q) =>
      q.eq("tokenIdentifier", claims.identity.tokenIdentifier),
    )
    .unique()
  return { ...claims, account }
}
export async function ensureAccount(ctx: MutationCtx) {
  const found = await findAccount(ctx)
  if (found.account) {
    if (
      found.identity.name &&
      found.identity.name !== found.account.displayName
    ) {
      await ctx.db.patch(found.account._id, {
        displayName: found.identity.name,
      })
      return {
        ...found,
        account: { ...found.account, displayName: found.identity.name },
      }
    }
    return { ...found, account: found.account }
  }
  const id = await ctx.db.insert("accounts", {
    tokenIdentifier: found.identity.tokenIdentifier,
    subject: found.identity.subject,
    issuer: found.identity.issuer,
    ...(found.identity.name ? { displayName: found.identity.name } : {}),
    role: "spectator",
  })
  const account = await ctx.db.get(id)
  if (!account) return fail("ACCOUNT_MISSING")
  return { ...found, account }
}
export async function requireAccount(ctx: ReadContext) {
  const found = await findAccount(ctx)
  if (!found.account) return fail("ACCOUNT_REQUIRED")
  return { ...found, account: found.account }
}
export async function requireModerator(ctx: ReadContext) {
  const found = await requireAccount(ctx)
  if (found.account.role !== "moderator" && found.account.role !== "admin")
    return fail("FORBIDDEN")
  return found
}
export async function requireAdmin(ctx: ReadContext) {
  const found = await requireAccount(ctx)
  if (found.account.role !== "admin") return fail("FORBIDDEN")
  return found
}
export async function requireReferent(
  ctx: Pick<QueryCtx, "db">,
  accountId: Id<"accounts">,
  groupId: Id<"groups">,
) {
  const grant = await ctx.db
    .query("groupReferents")
    .withIndex("by_account_group", (q) =>
      q.eq("accountId", accountId).eq("groupId", groupId),
    )
    .unique()
  if (!grant || grant.revokedAt !== undefined) return fail("REFERENT_REQUIRED")
  return grant
}
export function nonempty(value: string, max = 128) {
  if (!value.trim() || value.length > max) fail("INVALID_INPUT")
}
export function coordinates(latitude: number, longitude: number) {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  )
    fail("INVALID_COORDINATES")
}
