import { v } from "convex/values"

import { internalMutation, mutation, query } from "./_generated/server"
import { endSession, sessionView } from "./lib/live"
import {
  coordinates,
  fail,
  requireAdmin,
  requireModerator,
} from "./lib/security"
import { policyValidator, roleValidator } from "./schema"

export const setPolicy = mutation({
  args: { policy: policyValidator },
  handler: async (ctx, { policy }) => {
    const { account } = await requireModerator(ctx)
    coordinates(policy.zone.latitude, policy.zone.longitude)
    const positive = [
      policy.freshForMs,
      policy.hideAfterMs,
      policy.maxDurationMs,
      policy.maxSampleAgeMs,
      policy.maxAccuracyMeters,
      policy.zone.radiusMeters,
      policy.zone.confirmationMs,
      policy.speed.thresholdMps,
      policy.speed.persistenceMs,
      policy.speed.warningMs,
      policy.speed.maxGapMs,
    ]
    if (
      positive.some((value) => !Number.isFinite(value) || value <= 0) ||
      !Number.isFinite(policy.maxFutureSkewMs) ||
      policy.maxFutureSkewMs < 0 ||
      policy.freshForMs >= policy.hideAfterMs
    )
      return fail("INVALID_POLICY")
    // New versions apply to new sessions. Existing sessions retain their explicit policy snapshot.
    const policyId = await ctx.db.insert("trackingPolicies", {
      policy,
      createdBy: account._id,
      createdAt: Date.now(),
    })
    await ctx.db.insert("administrativeEvents", {
      type: "policy_created",
      actorId: account._id,
      occurredAt: Date.now(),
      policyId,
    })
    return policyId
  },
})
export const getPolicy = query({
  args: {},
  handler: async (ctx) => {
    await requireModerator(ctx)
    return await ctx.db.query("trackingPolicies").order("desc").first()
  },
})
export const setRole = mutation({
  args: { accountId: v.id("accounts"), role: roleValidator },
  handler: async (ctx, args) => {
    const { account } = await requireAdmin(ctx)
    if (account._id === args.accountId && args.role !== "admin")
      return fail("SELF_DEMOTION_FORBIDDEN")
    const target = await ctx.db.get(args.accountId)
    if (!target) return fail("ACCOUNT_NOT_FOUND")
    if (target.role === args.role) return { updated: true }
    await ctx.db.patch(args.accountId, { role: args.role })
    await ctx.db.insert("administrativeEvents", {
      type: "role_changed",
      actorId: account._id,
      occurredAt: Date.now(),
      accountId: target._id,
      previousRole: target.role,
      role: args.role,
    })
    return { updated: true }
  },
})
export const grantReferent = mutation({
  args: { accountId: v.id("accounts"), groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const { account } = await requireModerator(ctx)
    if (
      !(await ctx.db.get(args.accountId)) ||
      !(await ctx.db.get(args.groupId))
    )
      return fail("NOT_FOUND")
    const existing = await ctx.db
      .query("groupReferents")
      .withIndex("by_account_group", (q) =>
        q.eq("accountId", args.accountId).eq("groupId", args.groupId),
      )
      .unique()
    if (existing) {
      if (existing.revokedAt === undefined) return existing._id
      await ctx.db.patch(existing._id, {
        revokedAt: undefined,
        revokedBy: undefined,
        grantedAt: Date.now(),
        grantedBy: account._id,
      })
      await ctx.db.insert("administrativeEvents", {
        type: "referent_granted",
        actorId: account._id,
        occurredAt: Date.now(),
        ...args,
      })
      return existing._id
    }
    const grantId = await ctx.db.insert("groupReferents", {
      ...args,
      grantedAt: Date.now(),
      grantedBy: account._id,
    })
    await ctx.db.insert("administrativeEvents", {
      type: "referent_granted",
      actorId: account._id,
      occurredAt: Date.now(),
      ...args,
    })
    return grantId
  },
})
export const revokeReferent = mutation({
  args: { accountId: v.id("accounts"), groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const { account } = await requireModerator(ctx)
    const existing = await ctx.db
      .query("groupReferents")
      .withIndex("by_account_group", (q) =>
        q.eq("accountId", args.accountId).eq("groupId", args.groupId),
      )
      .unique()
    if (existing && existing.revokedAt === undefined) {
      await ctx.db.patch(existing._id, {
        revokedAt: Date.now(),
        revokedBy: account._id,
      })
      await ctx.db.insert("administrativeEvents", {
        type: "referent_revoked",
        actorId: account._id,
        occurredAt: Date.now(),
        ...args,
      })
    }
    const group = await ctx.db.get(args.groupId)
    const session = group?.activeSessionId
      ? await ctx.db.get(group.activeSessionId)
      : null
    if (
      session?.status === "active" &&
      session.emitterAccountId === args.accountId
    )
      await endSession(ctx, session, "revoked", account._id)
    return { revoked: true }
  },
})
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const { account } = await requireModerator(ctx)
    const sessions = await ctx.db
      .query("liveSessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect()
    return await Promise.all(
      sessions.map(async (session) => ({
        ...sessionView(session, account._id),
        title: (await ctx.db.get(session.groupId))?.title ?? "Groupe",
        emitterDisplayName:
          (await ctx.db.get(session.emitterAccountId))?.displayName ??
          "Référent sans nom",
        lastObservedAt: session.lastObservedAt ?? null,
      })),
    )
  },
})
// Internal provisioning is explicit and only accepts a previously authenticated account.
export const bootstrapAdministrator = internalMutation({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId)
    if (
      !account ||
      !process.env.BOOTSTRAP_ADMIN_SUBJECT ||
      account.subject !== process.env.BOOTSTRAP_ADMIN_SUBJECT ||
      account.issuer !== process.env.AUTH_ISSUER_URL
    )
      return fail("BOOTSTRAP_NOT_CONFIGURED")
    const admins = await ctx.db
      .query("accounts")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .first()
    if (admins && admins._id !== account._id)
      return fail("ADMIN_ALREADY_EXISTS")
    await ctx.db.patch(account._id, { role: "admin" })
    return { initialized: true }
  },
})

export const readAdminDirectory = query({
  args: {},
  handler: async (ctx) => {
    await requireModerator(ctx)
    const accounts = (await ctx.db.query("accounts").collect()).map(
      (account) => ({
        id: account._id,
        displayName: account.displayName ?? "Compte sans nom",
        role: account.role,
      }),
    )
    const groups = (await ctx.db.query("groups").collect()).map((group) => ({
      id: group._id,
      title: group.title,
    }))
    const grants = (await ctx.db.query("groupReferents").collect())
      .filter((grant) => grant.revokedAt === undefined)
      .map((grant) => ({ accountId: grant.accountId, groupId: grant.groupId }))
    return { accounts, groups, grants }
  },
})

export const moderationQueue = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireModerator(ctx)
    if (
      args.limit !== undefined &&
      (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 100)
    )
      return fail("INVALID_LIMIT")
    const limit = args.limit ?? 50
    const observations = await ctx.db
      .query("positions")
      .withIndex("by_source", (q) => q.eq("source", "community"))
      .order("desc")
      .filter((q) => q.eq(q.field("withdrawnAt"), undefined))
      .take(limit)
    const events = await ctx.db
      .query("operationEvents")
      .order("desc")
      .take(limit)
    return {
      observations: await Promise.all(
        observations.map(async (position) => ({
          id: position._id,
          groupTitle: (await ctx.db.get(position.group))?.title ?? "Groupe",
          observedAt: position.observedAt ?? null,
          receivedAt: position.receivedAt ?? position._creationTime,
          source: position.source,
        })),
      ),
      events: await Promise.all(
        events.map(async (event) => ({
          id: event._id,
          groupTitle: (await ctx.db.get(event.groupId))?.title ?? "Groupe",
          type: event.type,
          occurredAt: event.occurredAt,
          reason: event.reason ?? null,
        })),
      ),
    }
  },
})
