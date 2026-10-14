import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export const roleValidator = v.union(
  v.literal("spectator"),
  v.literal("moderator"),
  v.literal("admin"),
)
export const endReasonValidator = v.union(
  v.literal("manual"),
  v.literal("moderation"),
  v.literal("gps_failed"),
  v.literal("logout"),
  v.literal("duration"),
  v.literal("zone"),
  v.literal("speed"),
  v.literal("revoked"),
)
export const policyValidator = v.object({
  freshForMs: v.number(),
  hideAfterMs: v.number(),
  maxDurationMs: v.number(),
  maxFutureSkewMs: v.number(),
  maxSampleAgeMs: v.number(),
  maxAccuracyMeters: v.number(),
  zone: v.object({
    latitude: v.number(),
    longitude: v.number(),
    radiusMeters: v.number(),
    confirmationMs: v.number(),
  }),
  speed: v.object({
    thresholdMps: v.number(),
    persistenceMs: v.number(),
    warningMs: v.number(),
    maxGapMs: v.number(),
  }),
})

export default defineSchema({
  // Legacy rows and their identifiers are retained. isLive is only a compatibility projection.
  groups: defineTable({
    title: v.string(),
    isLive: v.optional(v.boolean()),
    activeSessionId: v.optional(v.id("liveSessions")),
    lastPositionId: v.optional(v.id("positions")),
  }),
  positions: defineTable({
    longitude: v.number(),
    latitude: v.number(),
    group: v.id("groups"),
    fromApp: v.boolean(),
    owner: v.optional(v.id("users")),
    source: v.optional(v.union(v.literal("referent"), v.literal("community"))),
    accountId: v.optional(v.id("accounts")),
    observedAt: v.optional(v.number()),
    receivedAt: v.optional(v.number()),
    sessionId: v.optional(v.id("liveSessions")),
    generation: v.optional(v.number()),
    sampleId: v.optional(v.string()),
    requestId: v.optional(v.string()),
    accuracyMeters: v.optional(v.number()),
    speedMps: v.optional(v.number()),
    withdrawnAt: v.optional(v.number()),
    withdrawnBy: v.optional(v.id("accounts")),
  })
    .index("by_group", ["group"])
    .index("by_source", ["source"])
    .index("by_session_sample", ["sessionId", "generation", "sampleId"])
    .index("by_account_request", ["accountId", "requestId"]),
  users: defineTable({
    pushToken: v.optional(v.string()),
    group: v.optional(v.id("groups")),
    isActive: v.optional(v.boolean()),
  }),
  accounts: defineTable({
    tokenIdentifier: v.string(),
    subject: v.string(),
    issuer: v.string(),
    displayName: v.optional(v.string()),
    role: roleValidator,
  }).index("by_identity", ["tokenIdentifier"]),
  authSessions: defineTable({
    sid: v.string(),
    subject: v.string(),
    issuer: v.string(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
  }).index("by_sid", ["sid"]),
  groupReferents: defineTable({
    accountId: v.id("accounts"),
    groupId: v.id("groups"),
    grantedBy: v.id("accounts"),
    grantedAt: v.number(),
    revokedAt: v.optional(v.number()),
    revokedBy: v.optional(v.id("accounts")),
  })
    .index("by_account_group", ["accountId", "groupId"])
    .index("by_group", ["groupId"]),
  administrativeEvents: defineTable({
    type: v.union(
      v.literal("role_changed"),
      v.literal("referent_granted"),
      v.literal("referent_revoked"),
      v.literal("policy_created"),
    ),
    actorId: v.id("accounts"),
    occurredAt: v.number(),
    accountId: v.optional(v.id("accounts")),
    groupId: v.optional(v.id("groups")),
    policyId: v.optional(v.id("trackingPolicies")),
    previousRole: v.optional(roleValidator),
    role: v.optional(roleValidator),
  }),
  trackingPolicies: defineTable({
    policy: policyValidator,
    createdBy: v.id("accounts"),
    createdAt: v.number(),
  }),
  liveSessions: defineTable({
    groupId: v.id("groups"),
    status: v.union(v.literal("active"), v.literal("ended")),
    emitterAccountId: v.id("accounts"),
    emitterAuthSessionId: v.string(),
    deviceId: v.string(),
    generation: v.number(),
    generationStartedAt: v.number(),
    startedBy: v.id("accounts"),
    startRequestId: v.string(),
    startedAt: v.number(),
    expiresAt: v.number(),
    policyId: v.id("trackingPolicies"),
    policy: policyValidator,
    endedAt: v.optional(v.number()),
    endReason: v.optional(endReasonValidator),
    endedBy: v.optional(v.id("accounts")),
    lastPositionId: v.optional(v.id("positions")),
    lastObservedAt: v.optional(v.number()),
    handoffToAccountId: v.optional(v.id("accounts")),
    zoneOutsideSince: v.optional(v.number()),
    speedOverSince: v.optional(v.number()),
    speedWarningAt: v.optional(v.number()),
    lastRuleObservedAt: v.optional(v.number()),
  })
    .index("by_group", ["groupId"])
    .index("by_account", ["emitterAccountId"])
    .index("by_auth_session", ["emitterAuthSessionId"])
    .index("by_start_request", ["startedBy", "startRequestId"])
    .index("by_status", ["status"]),
  operationEvents: defineTable({
    sessionId: v.id("liveSessions"),
    groupId: v.id("groups"),
    type: v.union(
      v.literal("speed_warning"),
      v.literal("ended"),
      v.literal("handoff"),
    ),
    occurredAt: v.number(),
    reason: v.optional(endReasonValidator),
    actorId: v.optional(v.id("accounts")),
  }).index("by_session", ["sessionId"]),
})
