import { v } from "convex/values"

import type { Id } from "./_generated/dataModel"
import { internal } from "./_generated/api"
import { internalAction, internalMutation } from "./_generated/server"
import { endSession } from "./lib/live"
import { fail } from "./lib/security"

function requireLocalFixtures(issuer: string) {
  const url = new URL(issuer)
  if (
    process.env.ALLOW_LOCAL_FIXTURES !== "true" ||
    issuer !== process.env.AUTH_ISSUER_URL ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  )
    return fail("LOCAL_FIXTURES_DISABLED")
}

/** Synthetic local-only data for API/runtime validation; never an operational policy or real group. */
export const seedScenario = internalMutation({
  args: {
    issuer: v.string(),
    adminSubject: v.string(),
    moderatorSubject: v.optional(v.string()),
    referentSubject: v.string(),
    otherReferentSubject: v.string(),
    spectatorSubject: v.string(),
  },
  handler: async (ctx, args) => {
    requireLocalFixtures(args.issuer)
    const principals = [
      { key: "admin", subject: args.adminSubject, role: "admin" as const },
      ...(args.moderatorSubject === undefined
        ? []
        : [
            {
              key: "moderator",
              subject: args.moderatorSubject,
              role: "moderator" as const,
            },
          ]),
      {
        key: "referent",
        subject: args.referentSubject,
        role: "spectator" as const,
      },
      {
        key: "otherReferent",
        subject: args.otherReferentSubject,
        role: "spectator" as const,
      },
      {
        key: "spectator",
        subject: args.spectatorSubject,
        role: "spectator" as const,
      },
    ]
    if (new Set(principals.map((p) => p.subject)).size !== principals.length)
      return fail("FIXTURE_SUBJECTS_MUST_DIFFER")
    const ids: Record<string, Id<"accounts">> = {}
    for (const principal of principals) {
      const tokenIdentifier = `${args.issuer}|${principal.subject}`
      const existing = await ctx.db
        .query("accounts")
        .withIndex("by_identity", (q) =>
          q.eq("tokenIdentifier", tokenIdentifier),
        )
        .unique()
      if (existing) ids[principal.key] = existing._id
      else
        ids[principal.key] = await ctx.db.insert("accounts", {
          tokenIdentifier,
          subject: principal.subject,
          issuer: args.issuer,
          displayName: `[SIMULATION] ${principal.key}`,
          role: principal.role,
        })
    }
    const adminId = ids.admin
    const referentId = ids.referent
    const otherReferentId = ids.otherReferent
    if (!adminId || !referentId || !otherReferentId)
      return fail("FIXTURE_INCOMPLETE")
    const title = "[SIMULATION LOCALE] Groupe témoin"
    const group = await ctx.db
      .query("groups")
      .filter((q) => q.eq(q.field("title"), title))
      .unique()
    const groupId =
      group?._id ?? (await ctx.db.insert("groups", { title, isLive: false }))
    const noPositionTitle = "[SIMULATION LOCALE] Groupe sans position"
    if (
      !(await ctx.db
        .query("groups")
        .filter((q) => q.eq(q.field("title"), noPositionTitle))
        .unique())
    )
      await ctx.db.insert("groups", { title: noPositionTitle, isLive: false })
    for (const accountId of [referentId, otherReferentId]) {
      const grant = await ctx.db
        .query("groupReferents")
        .withIndex("by_account_group", (q) =>
          q.eq("accountId", accountId).eq("groupId", groupId),
        )
        .unique()
      if (!grant)
        await ctx.db.insert("groupReferents", {
          accountId,
          groupId,
          grantedBy: adminId,
          grantedAt: Date.now(),
        })
    }
    let policy = await ctx.db.query("trackingPolicies").first()
    if (!policy) {
      const policyId = await ctx.db.insert("trackingPolicies", {
        createdBy: adminId,
        createdAt: Date.now(),
        policy: {
          freshForMs: 15_000,
          hideAfterMs: 45_000,
          maxDurationMs: 3_600_000,
          maxFutureSkewMs: 1000,
          maxSampleAgeMs: 120_000,
          maxAccuracyMeters: 50,
          zone: {
            latitude: 16.24,
            longitude: -61.53,
            radiusMeters: 1000,
            confirmationMs: 20_000,
          },
          speed: {
            thresholdMps: 10,
            persistenceMs: 10_000,
            warningMs: 10_000,
            maxGapMs: 15_000,
          },
        },
      })
      policy = await ctx.db.get(policyId)
    }
    return { synthetic: true, accounts: ids, groupId, policyId: policy?._id }
  },
})

const demoDevice = "simulation-native-map"
const demoGroups = [
  { title: "Soleil orange · démo", latitude: 16.2422, longitude: -61.5358 },
  { title: "Tambour bleu · démo", latitude: 16.2444, longitude: -61.5338 },
  { title: "Brise · démo", latitude: 16.2399, longitude: -61.5367 },
  { title: "Éclat · démo", latitude: 16.2459, longitude: -61.5395 },
  { title: "Horizon · démo", latitude: 16.2413, longitude: -61.5319 },
] as const

/** A local visual scene, separate from the smoke-test groups. No production defaults. */
export const seedNativeDemo = internalMutation({
  args: { issuer: v.string() },
  handler: async (
    ctx,
    { issuer },
  ): Promise<{ groupIds: Id<"groups">[]; alreadyRunning: boolean }> => {
    requireLocalFixtures(issuer)
    const accounts = []
    for (const subject of [
      "simulation-admin",
      "simulation-referent",
      "simulation-other-referent",
      "simulation-spectator",
    ]) {
      const account = await ctx.db
        .query("accounts")
        .withIndex("by_identity", (q) =>
          q.eq("tokenIdentifier", `${issuer}|${subject}`),
        )
        .unique()
      if (!account) return fail("RUN_SMOKE_FIXTURE_FIRST")
      accounts.push(account)
    }
    const [admin, referent, otherReferent, spectator] = accounts
    if (!admin || !referent || !otherReferent || !spectator)
      return fail("FIXTURE_INCOMPLETE")
    const groups = []
    for (const definition of demoGroups) {
      const found = await ctx.db
        .query("groups")
        .filter((q) => q.eq(q.field("title"), definition.title))
        .unique()
      const id =
        found?._id ??
        (await ctx.db.insert("groups", {
          title: definition.title,
          isLive: false,
        }))
      const group = await ctx.db.get(id)
      if (!group) return fail("GROUP_NOT_FOUND")
      groups.push(group)
    }
    for (const group of groups.slice(0, 2)) {
      if (!group.activeSessionId) continue
      const session = await ctx.db.get(group.activeSessionId)
      if (session?.status === "active" && session.expiresAt > Date.now())
        return {
          groupIds: groups.map((group) => group._id),
          alreadyRunning: true,
        }
    }
    const previousPolicy = await ctx.db
      .query("trackingPolicies")
      .order("desc")
      .first()
    if (!previousPolicy) return fail("RUN_SMOKE_FIXTURE_FIRST")
    const now = Date.now()
    const policy = {
      ...previousPolicy.policy,
      freshForMs: 3 * 60_000,
      hideAfterMs: 15 * 60_000,
      maxDurationMs: 2 * 60 * 60_000,
      zone: {
        latitude: 16.2422,
        longitude: -61.5361,
        radiusMeters: 5000,
        confirmationMs: 20_000,
      },
    }
    const policyId = await ctx.db.insert("trackingPolicies", {
      policy,
      createdBy: admin._id,
      createdAt: now,
    })
    const sessionIds: Id<"liveSessions">[] = []
    for (const [index, account] of [referent, otherReferent].entries()) {
      const group = groups[index]
      if (!group) return fail("FIXTURE_INCOMPLETE")
      const grant = await ctx.db
        .query("groupReferents")
        .withIndex("by_account_group", (q) =>
          q.eq("accountId", account._id).eq("groupId", group._id),
        )
        .unique()
      if (!grant)
        await ctx.db.insert("groupReferents", {
          accountId: account._id,
          groupId: group._id,
          grantedBy: admin._id,
          grantedAt: now,
        })
      const sessionId = await ctx.db.insert("liveSessions", {
        groupId: group._id,
        status: "active",
        emitterAccountId: account._id,
        emitterAuthSessionId: `${demoDevice}:${now}`,
        deviceId: demoDevice,
        generation: 1,
        generationStartedAt: now,
        startedBy: account._id,
        startRequestId: `${demoDevice}:${group._id}:${now}`,
        startedAt: now,
        expiresAt: now + policy.maxDurationMs,
        policyId,
        policy,
      })
      sessionIds.push(sessionId)
      await ctx.db.patch(group._id, {
        activeSessionId: sessionId,
        isLive: true,
      })
      await ctx.scheduler.runAt(
        now + policy.maxDurationMs,
        internal.sessions.expire,
        { sessionId },
      )
    }
    await ctx.scheduler.runAfter(0, internal.localFixtures.pumpNativeDemo, {
      issuer,
      sessionIds,
      groupIds: groups.map((group) => group._id),
      spectatorId: spectator._id,
      expiresAt: now + policy.maxDurationMs,
    })
    return { groupIds: groups.map((group) => group._id), alreadyRunning: false }
  },
})

/** Schedule outside the position transaction so a failed tick cannot stop the feed. */
export const pumpNativeDemo = internalAction({
  args: {
    issuer: v.string(),
    sessionIds: v.array(v.id("liveSessions")),
    groupIds: v.array(v.id("groups")),
    spectatorId: v.id("accounts"),
    expiresAt: v.number(),
  },
  handler: async (ctx, args): Promise<null> => {
    requireLocalFixtures(args.issuer)
    if (Date.now() >= args.expiresAt) return null
    const nextTick = await ctx.scheduler.runAfter(
      30_000,
      internal.localFixtures.pumpNativeDemo,
      args,
    )
    const active = await ctx.runMutation(
      internal.localFixtures.tickNativeDemo,
      {
        issuer: args.issuer,
        sessionIds: args.sessionIds,
        groupIds: args.groupIds,
        spectatorId: args.spectatorId,
      },
    )
    if (!active) await ctx.scheduler.cancel(nextTick)
    return null
  },
})

/** Real server timestamps advance; the older observation simulates a seven-minute reporting delay. */
export const tickNativeDemo = internalMutation({
  args: {
    issuer: v.string(),
    sessionIds: v.array(v.id("liveSessions")),
    groupIds: v.array(v.id("groups")),
    spectatorId: v.id("accounts"),
  },
  handler: async (ctx, args): Promise<boolean> => {
    requireLocalFixtures(args.issuer)
    const now = Date.now()
    let active = false
    for (const [index, sessionId] of args.sessionIds.entries()) {
      const session = await ctx.db.get(sessionId)
      const definition = demoGroups[index]
      if (
        !session ||
        !definition ||
        session.deviceId !== demoDevice ||
        session.status !== "active"
      )
        continue
      const group = await ctx.db.get(session.groupId)
      if (
        group?.activeSessionId !== sessionId ||
        group.title !== definition.title
      )
        continue
      if (session.expiresAt <= now) {
        await endSession(ctx, session, "duration")
        continue
      }
      active = true
      const phase = (now - session.startedAt) / 180_000 + index
      const positionId = await ctx.db.insert("positions", {
        group: group._id,
        fromApp: true,
        source: "referent",
        accountId: session.emitterAccountId,
        sessionId,
        generation: session.generation,
        sampleId: `${demoDevice}:${now}`,
        observedAt: now,
        receivedAt: now,
        latitude: definition.latitude + Math.sin(phase) * 0.0003,
        longitude: definition.longitude + Math.cos(phase) * 0.0003,
        accuracyMeters: 5,
      })
      await ctx.db.patch(sessionId, {
        lastPositionId: positionId,
        lastObservedAt: now,
      })
      await ctx.db.patch(group._id, { lastPositionId: positionId })
    }
    if (!active) return false
    for (const index of [2, 3]) {
      const groupId = args.groupIds[index]
      const definition = demoGroups[index]
      if (!groupId || !definition) return fail("FIXTURE_INCOMPLETE")
      const group = await ctx.db.get(groupId)
      if (!group || group.title !== definition.title || group.activeSessionId)
        continue
      const positionId = await ctx.db.insert("positions", {
        group: groupId,
        fromApp: false,
        source: "community",
        accountId: args.spectatorId,
        observedAt: now - (index === 3 ? 7 * 60_000 : 0),
        receivedAt: now,
        latitude: definition.latitude,
        longitude: definition.longitude,
        requestId: `${demoDevice}:${groupId}:${now}`,
      })
      await ctx.db.patch(groupId, { lastPositionId: positionId })
    }
    return true
  },
})

export const stopNativeDemo = internalMutation({
  args: { issuer: v.string() },
  handler: async (ctx, { issuer }) => {
    requireLocalFixtures(issuer)
    let stopped = 0
    for (const definition of demoGroups.slice(0, 2)) {
      const group = await ctx.db
        .query("groups")
        .filter((q) => q.eq(q.field("title"), definition.title))
        .unique()
      if (!group?.activeSessionId) continue
      const session = await ctx.db.get(group.activeSessionId)
      if (session?.status === "active" && session.deviceId === demoDevice) {
        await endSession(ctx, session, "manual", session.emitterAccountId)
        stopped++
      }
    }
    return { stopped }
  },
})
