import { v } from "convex/values"

import type { SessionView } from "../src/contracts"
import { internal } from "./_generated/api"
import { internalMutation, mutation, query } from "./_generated/server"
import {
  currentLive,
  endSession,
  requireEmitter,
  sessionView,
} from "./lib/live"
import {
  ensureAccount,
  fail,
  findAccount,
  nonempty,
  requireAccount,
  requireModerator,
  requireReferent,
} from "./lib/security"

const emitterArgs = {
  sessionId: v.id("liveSessions"),
  deviceId: v.string(),
  generation: v.number(),
}
export const start = mutation({
  args: {
    groupId: v.id("groups"),
    deviceId: v.string(),
    requestId: v.string(),
  },
  handler: async (ctx, args): Promise<SessionView> => {
    nonempty(args.deviceId)
    nonempty(args.requestId)
    const { account, sid } = await ensureAccount(ctx)
    await requireReferent(ctx, account._id, args.groupId)
    const group = await ctx.db.get(args.groupId)
    if (!group) return fail("GROUP_NOT_FOUND")
    const retried = await ctx.db
      .query("liveSessions")
      .withIndex("by_start_request", (q) =>
        q.eq("startedBy", account._id).eq("startRequestId", args.requestId),
      )
      .unique()
    if (retried) {
      if (
        retried.groupId !== args.groupId ||
        retried.deviceId !== args.deviceId
      )
        return fail("IDEMPOTENCY_CONFLICT")
      return sessionView(retried, account._id)
    }
    if (await currentLive(ctx, group)) return fail("GROUP_ALREADY_LIVE")
    const policy = await ctx.db.query("trackingPolicies").order("desc").first()
    if (!policy) return fail("CONFIGURATION_REQUIRED")
    const now = Date.now()
    const id = await ctx.db.insert("liveSessions", {
      groupId: group._id,
      status: "active",
      emitterAccountId: account._id,
      emitterAuthSessionId: sid,
      deviceId: args.deviceId,
      generation: 1,
      generationStartedAt: now,
      startedBy: account._id,
      startRequestId: args.requestId,
      startedAt: now,
      expiresAt: now + policy.policy.maxDurationMs,
      policyId: policy._id,
      policy: policy.policy,
    })
    await ctx.db.patch(group._id, { activeSessionId: id, isLive: true })
    await ctx.scheduler.runAt(
      now + policy.policy.maxDurationMs,
      internal.sessions.expire,
      { sessionId: id },
    )
    const session = await ctx.db.get(id)
    if (!session) return fail("SESSION_NOT_FOUND")
    return sessionView(session, account._id)
  },
})
export const stop = mutation({
  args: {
    ...emitterArgs,
    reason: v.union(
      v.literal("manual"),
      v.literal("gps_failed"),
      v.literal("logout"),
    ),
  },
  handler: async (ctx, args): Promise<SessionView> => {
    const { account, sid } = await requireAccount(ctx)
    const session = await ctx.db.get(args.sessionId)
    if (!session) return fail("SESSION_NOT_FOUND")
    requireEmitter(session, account._id, args.deviceId, args.generation, sid)
    return sessionView(
      await endSession(ctx, session, args.reason, account._id),
      account._id,
    )
  },
})
export const stopAsModerator = mutation({
  args: { sessionId: v.id("liveSessions") },
  handler: async (ctx, args): Promise<SessionView> => {
    const { account } = await requireModerator(ctx)
    const session = await ctx.db.get(args.sessionId)
    if (!session) return fail("SESSION_NOT_FOUND")
    return sessionView(
      await endSession(ctx, session, "moderation", account._id),
      account._id,
    )
  },
})
export const expire = internalMutation({
  args: { sessionId: v.id("liveSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)
    if (
      !session ||
      session.status === "ended" ||
      session.expiresAt > Date.now()
    )
      return false
    await endSession(ctx, session, "duration")
    return true
  },
})
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const { account } = await findAccount(ctx)
    if (!account) return { groups: [], sessions: [] }
    const grants = await ctx.db
      .query("groupReferents")
      .withIndex("by_account_group", (q) => q.eq("accountId", account._id))
      .collect()
    const groups = []
    const own = await ctx.db
      .query("liveSessions")
      .withIndex("by_account", (q) => q.eq("emitterAccountId", account._id))
      .collect()
    const sessions = new Map(own.map((session) => [session._id, session]))
    for (const grant of grants) {
      if (grant.revokedAt !== undefined) continue
      const group = await ctx.db.get(grant.groupId)
      if (!group) continue
      groups.push({ id: group._id, title: group.title })
      if (group.activeSessionId) {
        const session = await ctx.db.get(group.activeSessionId)
        if (session) sessions.set(session._id, session)
      }
    }
    return {
      groups,
      sessions: Array.from(sessions.values()).map((session) =>
        sessionView(session, account._id),
      ),
    }
  },
})
export const referents = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const { account } = await requireAccount(ctx)
    if (account.role === "spectator")
      await requireReferent(ctx, account._id, args.groupId)
    const grants = await ctx.db
      .query("groupReferents")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect()
    const result = []
    for (const grant of grants) {
      if (grant.revokedAt !== undefined) continue
      const referent = await ctx.db.get(grant.accountId)
      if (referent)
        result.push({
          accountId: referent._id,
          displayName: referent.displayName ?? "Référent",
        })
    }
    return result
  },
})
export const offerHandoff = mutation({
  args: { ...emitterArgs, targetAccountId: v.id("accounts") },
  handler: async (ctx, args): Promise<SessionView> => {
    const { account, sid } = await requireAccount(ctx)
    const session = await ctx.db.get(args.sessionId)
    if (!session) return fail("SESSION_NOT_FOUND")
    requireEmitter(session, account._id, args.deviceId, args.generation, sid)
    if (session.status === "ended" || session.expiresAt <= Date.now())
      return fail("SESSION_ENDED")
    await requireReferent(ctx, account._id, session.groupId)
    await requireReferent(ctx, args.targetAccountId, session.groupId)
    await ctx.db.patch(session._id, {
      handoffToAccountId: args.targetAccountId,
    })
    return sessionView(
      { ...session, handoffToAccountId: args.targetAccountId },
      account._id,
    )
  },
})
export const cancelHandoff = mutation({
  args: emitterArgs,
  handler: async (ctx, args): Promise<SessionView> => {
    const { account, sid } = await requireAccount(ctx)
    const session = await ctx.db.get(args.sessionId)
    if (!session) return fail("SESSION_NOT_FOUND")
    requireEmitter(session, account._id, args.deviceId, args.generation, sid)
    if (session.status === "ended") return fail("SESSION_ENDED")
    await ctx.db.patch(session._id, { handoffToAccountId: undefined })
    return sessionView(
      { ...session, handoffToAccountId: undefined },
      account._id,
    )
  },
})
export const acceptHandoff = mutation({
  args: emitterArgs,
  handler: async (ctx, args): Promise<SessionView> => {
    nonempty(args.deviceId)
    const { account, sid } = await requireAccount(ctx)
    const session = await ctx.db.get(args.sessionId)
    if (!session) return fail("SESSION_NOT_FOUND")
    if (session.status === "ended" || session.expiresAt <= Date.now())
      return fail("SESSION_ENDED")
    if (
      session.handoffToAccountId !== account._id ||
      session.generation !== args.generation
    )
      return fail("HANDOFF_NOT_AVAILABLE")
    await requireReferent(ctx, account._id, session.groupId)
    const update = {
      emitterAccountId: account._id,
      emitterAuthSessionId: sid,
      deviceId: args.deviceId,
      generation: session.generation + 1,
      generationStartedAt: Date.now(),
      handoffToAccountId: undefined,
      zoneOutsideSince: undefined,
      speedOverSince: undefined,
      speedWarningAt: undefined,
      lastRuleObservedAt: undefined,
    }
    await ctx.db.patch(session._id, update)
    await ctx.db.insert("operationEvents", {
      sessionId: session._id,
      groupId: session.groupId,
      type: "handoff",
      occurredAt: Date.now(),
      actorId: account._id,
    })
    return sessionView({ ...session, ...update }, account._id)
  },
})
export const events = query({
  args: { sessionId: v.id("liveSessions") },
  handler: async (ctx, args) => {
    const { account } = await requireAccount(ctx)
    const session = await ctx.db.get(args.sessionId)
    if (!session) return fail("SESSION_NOT_FOUND")
    if (account.role === "spectator")
      await requireReferent(ctx, account._id, session.groupId)
    return (
      await ctx.db
        .query("operationEvents")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect()
    ).map(({ _id, type, occurredAt, reason }) => ({
      id: _id,
      type,
      occurredAt,
      ...(reason ? { reason } : {}),
    }))
  },
})
