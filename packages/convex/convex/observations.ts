import { v } from "convex/values"

import { mutation } from "./_generated/server"
import { currentLive } from "./lib/live"
import {
  coordinates,
  ensureAccount,
  fail,
  nonempty,
  requireModerator,
} from "./lib/security"

export const create = mutation({
  args: {
    groupId: v.id("groups"),
    requestId: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    observedAt: v.number(),
  },
  handler: async (ctx, args) => {
    coordinates(args.latitude, args.longitude)
    nonempty(args.requestId)
    const { account } = await ensureAccount(ctx)
    const group = await ctx.db.get(args.groupId)
    if (!group) return fail("GROUP_NOT_FOUND")
    const policy = await ctx.db.query("trackingPolicies").order("desc").first()
    if (!policy) return fail("CONFIGURATION_REQUIRED")
    const now = Date.now()
    if (
      !Number.isFinite(args.observedAt) ||
      args.observedAt > now + policy.policy.maxFutureSkewMs ||
      args.observedAt < now - policy.policy.maxSampleAgeMs
    )
      return fail("INVALID_OBSERVATION_TIME")
    const previous = await ctx.db
      .query("positions")
      .withIndex("by_account_request", (q) =>
        q.eq("accountId", account._id).eq("requestId", args.requestId),
      )
      .unique()
    if (previous) {
      if (
        previous.group !== args.groupId ||
        previous.latitude !== args.latitude ||
        previous.longitude !== args.longitude ||
        previous.observedAt !== args.observedAt
      )
        return fail("IDEMPOTENCY_CONFLICT")
      return previous._id
    }
    if (await currentLive(ctx, group)) return fail("GROUP_ALREADY_LIVE")
    const id = await ctx.db.insert("positions", {
      group: args.groupId,
      requestId: args.requestId,
      latitude: args.latitude,
      longitude: args.longitude,
      observedAt: args.observedAt,
      receivedAt: now,
      fromApp: false,
      source: "community",
      accountId: account._id,
    })
    const current = group.lastPositionId
      ? await ctx.db.get(group.lastPositionId)
      : null
    if (
      !current ||
      args.observedAt >= (current.observedAt ?? current._creationTime)
    )
      await ctx.db.patch(group._id, { lastPositionId: id })
    return id
  },
})
export const retract = mutation({
  args: { positionId: v.id("positions") },
  handler: async (ctx, args) => {
    const { account } = await requireModerator(ctx)
    const position = await ctx.db.get(args.positionId)
    if (
      !position ||
      position.source === "referent" ||
      (position.source === undefined && position.fromApp)
    )
      return fail("OBSERVATION_NOT_FOUND")
    if (position.withdrawnAt !== undefined) return { withdrawn: true }
    await ctx.db.patch(position._id, {
      withdrawnAt: Date.now(),
      withdrawnBy: account._id,
    })
    const group = await ctx.db.get(position.group)
    if (group?.lastPositionId === position._id) {
      const previous = (
        await ctx.db
          .query("positions")
          .withIndex("by_group", (q) => q.eq("group", position.group))
          .collect()
      )
        .filter((p) => p.withdrawnAt === undefined && p._id !== position._id)
        .sort(
          (a, b) =>
            (b.observedAt ?? b._creationTime) -
            (a.observedAt ?? a._creationTime),
        )[0]
      await ctx.db.patch(group._id, { lastPositionId: previous?._id })
    }
    return { withdrawn: true }
  },
})
