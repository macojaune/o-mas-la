import { v } from "convex/values"

import { mutation } from "./_generated/server"
import { endSession, requireEmitter } from "./lib/live"
import {
  coordinates,
  fail,
  nonempty,
  requireAccount,
  requireReferent,
} from "./lib/security"

function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const rad = Math.PI / 180
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) *
      Math.cos(lat2 * rad) *
      Math.sin(((lon2 - lon1) * rad) / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
}
export const ingest = mutation({
  args: {
    sessionId: v.id("liveSessions"),
    deviceId: v.string(),
    generation: v.number(),
    sampleId: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    observedAt: v.number(),
    accuracyMeters: v.optional(v.number()),
    speedMps: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { account, sid } = await requireAccount(ctx)
    coordinates(args.latitude, args.longitude)
    nonempty(args.sampleId)
    nonempty(args.deviceId)
    const session = await ctx.db.get(args.sessionId)
    if (!session) return fail("SESSION_NOT_FOUND")
    requireEmitter(session, account._id, args.deviceId, args.generation, sid)
    await requireReferent(ctx, account._id, session.groupId)
    if (session.status === "ended")
      return {
        accepted: false,
        duplicate: false,
        sessionEnded: true,
        reason: session.endReason,
      }
    if (session.expiresAt <= Date.now()) {
      await endSession(ctx, session, "duration")
      return {
        accepted: false,
        duplicate: false,
        sessionEnded: true,
        reason: "duration",
      }
    }
    const { policy } = session
    const now = Date.now()
    if (
      !Number.isFinite(args.observedAt) ||
      args.observedAt > now + policy.maxFutureSkewMs ||
      args.observedAt < now - policy.maxSampleAgeMs ||
      args.observedAt < session.generationStartedAt
    )
      return fail("INVALID_OBSERVATION_TIME")
    if (
      args.accuracyMeters !== undefined &&
      (!Number.isFinite(args.accuracyMeters) || args.accuracyMeters < 0)
    )
      return fail("INVALID_ACCURACY")
    if (
      args.speedMps !== undefined &&
      (!Number.isFinite(args.speedMps) || args.speedMps < 0)
    )
      return fail("INVALID_SPEED")
    const duplicate = await ctx.db
      .query("positions")
      .withIndex("by_session_sample", (q) =>
        q
          .eq("sessionId", session._id)
          .eq("generation", args.generation)
          .eq("sampleId", args.sampleId),
      )
      .unique()
    if (duplicate) {
      if (
        duplicate.latitude !== args.latitude ||
        duplicate.longitude !== args.longitude ||
        duplicate.observedAt !== args.observedAt ||
        duplicate.speedMps !== args.speedMps ||
        duplicate.accuracyMeters !== args.accuracyMeters
      )
        return fail("IDEMPOTENCY_CONFLICT")
      return {
        accepted: true,
        duplicate: true,
        sessionEnded: false,
        speedWarningAt: session.speedWarningAt,
      }
    }
    if (
      session.lastObservedAt !== undefined &&
      args.observedAt <= session.lastObservedAt
    )
      return {
        accepted: false,
        duplicate: false,
        sessionEnded: false,
        reason: "out_of_order",
      }
    // Unreliable measurements are never used to prove persistence of speed or zone breaches.
    const accurate =
      args.accuracyMeters !== undefined &&
      args.accuracyMeters <= policy.maxAccuracyMeters
    const continuous =
      session.lastRuleObservedAt !== undefined &&
      args.observedAt - session.lastRuleObservedAt <= policy.speed.maxGapMs
    let zoneOutsideSince = continuous ? session.zoneOutsideSince : undefined
    let speedOverSince = continuous ? session.speedOverSince : undefined
    let speedWarningAt = continuous ? session.speedWarningAt : undefined
    if (accurate) {
      const outside =
        distanceMeters(
          args.latitude,
          args.longitude,
          policy.zone.latitude,
          policy.zone.longitude,
        ) -
          (args.accuracyMeters ?? Infinity) >
        policy.zone.radiusMeters
      if (outside) {
        if (
          zoneOutsideSince !== undefined &&
          args.observedAt - zoneOutsideSince >= policy.zone.confirmationMs
        ) {
          await endSession(ctx, session, "zone")
          return {
            accepted: false,
            duplicate: false,
            sessionEnded: true,
            reason: "zone",
          }
        }
        zoneOutsideSince ??= args.observedAt
      } else zoneOutsideSince = undefined
      if (
        args.speedMps !== undefined &&
        args.speedMps > policy.speed.thresholdMps
      ) {
        speedOverSince ??= args.observedAt
        if (
          speedWarningAt !== undefined &&
          now - speedWarningAt >= policy.speed.warningMs &&
          args.observedAt >= speedWarningAt + policy.speed.warningMs
        ) {
          await endSession(ctx, session, "speed")
          return {
            accepted: false,
            duplicate: false,
            sessionEnded: true,
            reason: "speed",
          }
        }
        if (
          speedWarningAt === undefined &&
          args.observedAt - speedOverSince >= policy.speed.persistenceMs
        ) {
          speedWarningAt = now
          await ctx.db.insert("operationEvents", {
            sessionId: session._id,
            groupId: session.groupId,
            type: "speed_warning",
            occurredAt: now,
          })
        }
      } else {
        speedOverSince = undefined
        speedWarningAt = undefined
      }
    } else {
      zoneOutsideSince = undefined
      speedOverSince = undefined
      speedWarningAt = undefined
    }
    if (!accurate && args.accuracyMeters !== undefined) {
      await ctx.db.patch(session._id, {
        zoneOutsideSince: undefined,
        speedOverSince: undefined,
        speedWarningAt: undefined,
        lastRuleObservedAt: undefined,
      })
      return {
        accepted: false,
        duplicate: false,
        sessionEnded: false,
        reason: "inaccurate",
      }
    }
    const id = await ctx.db.insert("positions", {
      group: session.groupId,
      latitude: args.latitude,
      longitude: args.longitude,
      fromApp: true,
      source: "referent",
      accountId: account._id,
      observedAt: args.observedAt,
      receivedAt: now,
      sessionId: session._id,
      generation: args.generation,
      sampleId: args.sampleId,
      ...(args.accuracyMeters !== undefined
        ? { accuracyMeters: args.accuracyMeters }
        : {}),
      ...(args.speedMps !== undefined ? { speedMps: args.speedMps } : {}),
    })
    await ctx.db.patch(session._id, {
      lastPositionId: id,
      lastObservedAt: args.observedAt,
      lastRuleObservedAt: accurate ? args.observedAt : undefined,
      zoneOutsideSince,
      speedOverSince,
      speedWarningAt,
    })
    await ctx.db.patch(session.groupId, { lastPositionId: id })
    return {
      accepted: true,
      duplicate: false,
      sessionEnded: false,
      speedWarningAt,
    }
  },
})
