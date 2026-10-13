import { convexTest } from "convex-test"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Id } from "../convex/_generated/dataModel"
import type { TrackingPolicy } from "../src/contracts"
import { api, internal } from "../convex/_generated/api"
import schema from "../convex/schema"
import { positionFreshness } from "../src/contracts"

const modules = import.meta.glob("../convex/**/!(*.test|auth.config)*.ts")
const now = Date.UTC(2026, 9, 13, 12)
// Explicit simulation parameters. Never deployed or used as production defaults.
const policy: TrackingPolicy = {
  freshForMs: 10_000,
  hideAfterMs: 30_000,
  maxDurationMs: 600_000,
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
}
const claims = (name: string, hex: string) => ({
  name,
  subject: name,
  issuer: "https://test.omasla.invalid",
  tokenIdentifier: `https://test.omasla.invalid|${name}`,
  sid: hex.repeat(64),
  sessionExpiresAt: now + 3_600_000,
})
async function setup(configured = true) {
  const t = convexTest(schema, modules)
  const admin = t.withIdentity(claims("Admin", "a"))
  const alice = t.withIdentity(claims("Alice", "b"))
  const bob = t.withIdentity(claims("Bob", "c"))
  const publicUser = t.withIdentity(claims("Spectator", "d"))
  const mod = t.withIdentity(claims("Moderator", "e"))
  const adminId = await admin.mutation(api.accounts.ensure, {})
  const aliceId = await alice.mutation(api.accounts.ensure, {})
  const bobId = await bob.mutation(api.accounts.ensure, {})
  await publicUser.mutation(api.accounts.ensure, {})
  const modId = await mod.mutation(api.accounts.ensure, {})
  await t.run(async (ctx) => {
    await ctx.db.patch(adminId, { role: "admin" })
    await ctx.db.patch(modId, { role: "moderator" })
  })
  const groupId = await admin.mutation(api.groups.create, {
    title: "Groupe témoin",
  })
  const otherGroup = await admin.mutation(api.groups.create, {
    title: "Sans suivi",
  })
  await admin.mutation(api.administration.grantReferent, {
    accountId: aliceId,
    groupId,
  })
  await admin.mutation(api.administration.grantReferent, {
    accountId: bobId,
    groupId,
  })
  if (configured) await admin.mutation(api.administration.setPolicy, { policy })
  const start = () =>
    alice.mutation(api.sessions.start, {
      groupId,
      deviceId: "alice-phone",
      requestId: "start-1",
    })
  const observe = (requestId = "observation-1") =>
    publicUser.mutation(api.observations.create, {
      groupId,
      requestId,
      latitude: 16.24,
      longitude: -61.53,
      observedAt: Date.now(),
    })
  return {
    t,
    admin,
    alice,
    bob,
    publicUser,
    mod,
    adminId,
    modId,
    aliceId,
    bobId,
    groupId,
    otherGroup,
    start,
    observe,
  }
}
const point = (
  session: { id: Id<"liveSessions">; generation: number },
  sampleId = "sample-1",
  extra: Record<string, number> = {},
) => ({
  sessionId: session.id,
  deviceId: "alice-phone",
  generation: session.generation,
  sampleId,
  latitude: 16.24,
  longitude: -61.53,
  observedAt: Date.now(),
  accuracyMeters: 5,
  ...extra,
})
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
})
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe("public reads and server permissions", () => {
  it("retains all groups publicly without leaking emitter identities", async () => {
    const { t, start, alice } = await setup()
    const session = await start()
    await alice.mutation(api.telemetry.ingest, point(session))
    const catalog = await t.query(api.catalog.list, {})
    expect(catalog.groups).toHaveLength(2)
    expect(catalog.groups.find((g) => g.live)?.position?.source).toBe(
      "referent",
    )
    expect(JSON.stringify(catalog)).not.toMatch(
      /tokenIdentifier|sid|pushToken|emitterAccountId|accountId/,
    )
  })
  it("refuses anonymous writes, other-group referents, and public moderation", async () => {
    const { t, alice, publicUser, groupId, otherGroup, observe } = await setup()
    await expect(
      t.mutation(api.sessions.start, {
        groupId,
        deviceId: "x",
        requestId: "x",
      }),
    ).rejects.toThrow("AUTH_REQUIRED")
    await expect(
      t.mutation(api.observations.create, {
        groupId,
        requestId: "x",
        latitude: 0,
        longitude: 0,
        observedAt: now,
      }),
    ).rejects.toThrow("AUTH_REQUIRED")
    await expect(
      alice.mutation(api.sessions.start, {
        groupId: otherGroup,
        deviceId: "x",
        requestId: "x",
      }),
    ).rejects.toThrow("REFERENT_REQUIRED")
    const id = await observe()
    await expect(
      publicUser.mutation(api.observations.retract, { positionId: id }),
    ).rejects.toThrow("FORBIDDEN")
    await expect(
      publicUser.mutation(api.administration.setPolicy, { policy }),
    ).rejects.toThrow("FORBIDDEN")
  })
  it("closes all legacy anonymous writes and user/token enumeration", async () => {
    const { t, alice, groupId } = await setup()
    await expect(t.query(api.users.getAllUsers, {})).rejects.toThrow(
      "AUTH_REQUIRED",
    )
    await expect(
      t.mutation(api.users.create, { pushToken: "not-a-principal" }),
    ).rejects.toThrow("AUTH_REQUIRED")
    await expect(
      alice.mutation(api.positions.sendPosition, {
        groupId,
        latitude: 0,
        longitude: 0,
        fromApp: true,
      }),
    ).rejects.toThrow("LEGACY_API_DISABLED")
    await expect(
      t.action(api.sendNotifications.sendPushToAll, { title: "x", body: "x" }),
    ).rejects.toThrow("LEGACY_API_DISABLED")
  })
  it("requires explicit policy without inventing defaults or treating legacy users as referents", async () => {
    const { t, start } = await setup(false)
    await expect(start()).rejects.toThrow("CONFIGURATION_REQUIRED")
    expect((await t.query(api.catalog.list, {})).policy).toBeNull()
  })
  it("lets the moderation team manage referents and tracking settings with an audit trail", async () => {
    const { t, mod, modId, aliceId, alice, groupId, otherGroup, start } =
      await setup()
    const session = await start()
    const policyId = await mod.mutation(api.administration.setPolicy, {
      policy: { ...policy, maxDurationMs: 300_000 },
    })
    expect(await mod.query(api.administration.getPolicy, {})).toMatchObject({
      _id: policyId,
      createdBy: modId,
      policy: { maxDurationMs: 300_000 },
    })
    await mod.mutation(api.administration.grantReferent, {
      accountId: aliceId,
      groupId: otherGroup,
    })
    const newSession = await alice.mutation(api.sessions.start, {
      groupId: otherGroup,
      deviceId: "other-phone",
      requestId: "moderator-grant",
    })
    expect(newSession.expiresAt).toBe(now + 300_000)
    expect((await t.run((ctx) => ctx.db.get(session.id)))?.policy).toEqual(
      policy,
    )
    await mod.mutation(api.administration.revokeReferent, {
      accountId: aliceId,
      groupId,
    })
    expect(await t.run((ctx) => ctx.db.get(session.id))).toMatchObject({
      status: "ended",
      endReason: "revoked",
      endedBy: modId,
    })
    await expect(
      alice.mutation(api.telemetry.ingest, point(session)),
    ).rejects.toThrow("REFERENT_REQUIRED")
    const events = await t.run((ctx) =>
      ctx.db.query("administrativeEvents").collect(),
    )
    expect(
      events
        .filter((event) => event.actorId === modId)
        .map((event) => event.type),
    ).toEqual(["policy_created", "referent_granted", "referent_revoked"])
  })
  it("refuses spectator access to settings, the directory and referent permissions", async () => {
    const { publicUser, aliceId, groupId } = await setup()
    await expect(
      publicUser.query(api.administration.getPolicy, {}),
    ).rejects.toThrow("FORBIDDEN")
    await expect(
      publicUser.query(api.administration.readAdminDirectory, {}),
    ).rejects.toThrow("FORBIDDEN")
    await expect(
      publicUser.mutation(api.administration.setPolicy, { policy }),
    ).rejects.toThrow("FORBIDDEN")
    await expect(
      publicUser.mutation(api.administration.grantReferent, {
        accountId: aliceId,
        groupId,
      }),
    ).rejects.toThrow("FORBIDDEN")
    await expect(
      publicUser.mutation(api.administration.revokeReferent, {
        accountId: aliceId,
        groupId,
      }),
    ).rejects.toThrow("FORBIDDEN")
  })
  it("keeps platform role promotion admin-only and prevents removing the final administrator", async () => {
    const { t, admin, adminId, mod, modId, publicUser, aliceId } = await setup()
    for (const actor of [mod, publicUser]) {
      await expect(
        actor.mutation(api.administration.setRole, {
          accountId: aliceId,
          role: "moderator",
        }),
      ).rejects.toThrow("FORBIDDEN")
      await expect(
        actor.mutation(api.administration.setRole, {
          accountId: modId,
          role: "admin",
        }),
      ).rejects.toThrow("FORBIDDEN")
      await expect(
        actor.mutation(api.administration.setRole, {
          accountId: adminId,
          role: "spectator",
        }),
      ).rejects.toThrow("FORBIDDEN")
    }
    await expect(
      admin.mutation(api.administration.setRole, {
        accountId: adminId,
        role: "moderator",
      }),
    ).rejects.toThrow("SELF_DEMOTION_FORBIDDEN")
    expect(await t.run((ctx) => ctx.db.get(adminId))).toMatchObject({
      role: "admin",
    })
    expect(await t.run((ctx) => ctx.db.get(modId))).toMatchObject({
      role: "moderator",
    })
  })
})
describe("session lifecycle and handoff", () => {
  it("deduplicates start and never resurrects a terminated session", async () => {
    const { alice, start } = await setup()
    const session = await start()
    expect((await start()).id).toBe(session.id)
    const stopped = await alice.mutation(api.sessions.stop, {
      sessionId: session.id,
      deviceId: session.deviceId,
      generation: session.generation,
      reason: "manual",
    })
    vi.setSystemTime(now + 1000)
    expect(
      await alice.mutation(api.sessions.stop, {
        sessionId: session.id,
        deviceId: session.deviceId,
        generation: session.generation,
        reason: "gps_failed",
      }),
    ).toEqual(stopped)
    expect((await start()).status).toBe("ended")
    expect(
      await alice.mutation(api.telemetry.ingest, point(session)),
    ).toMatchObject({ accepted: false, sessionEnded: true })
  })
  it("only admits one of two competing starts", async () => {
    const { alice, bob, groupId } = await setup()
    const outcomes = await Promise.allSettled([
      alice.mutation(api.sessions.start, {
        groupId,
        deviceId: "a",
        requestId: "a",
      }),
      bob.mutation(api.sessions.start, {
        groupId,
        deviceId: "b",
        requestId: "b",
      }),
    ])
    expect(outcomes.filter((x) => x.status === "fulfilled")).toHaveLength(1)
  })
  it("requires explicit handoff and revokes the old generation atomically", async () => {
    const { alice, bob, bobId, start, groupId } = await setup()
    const session = await start()
    await expect(
      bob.mutation(api.sessions.start, {
        groupId,
        deviceId: "bob-phone",
        requestId: "b",
      }),
    ).rejects.toThrow("GROUP_ALREADY_LIVE")
    await alice.mutation(api.sessions.offerHandoff, {
      sessionId: session.id,
      deviceId: session.deviceId,
      generation: 1,
      targetAccountId: bobId,
    })
    const next = await bob.mutation(api.sessions.acceptHandoff, {
      sessionId: session.id,
      deviceId: "bob-phone",
      generation: 1,
    })
    expect(next.generation).toBe(2)
    expect(next.expiresAt).toBe(session.expiresAt)
    await expect(
      alice.mutation(api.telemetry.ingest, point(session)),
    ).rejects.toThrow("EMITTER_REVOKED")
    await expect(
      bob.mutation(api.sessions.acceptHandoff, {
        sessionId: session.id,
        deviceId: "bob-phone",
        generation: 1,
      }),
    ).rejects.toThrow("HANDOFF_NOT_AVAILABLE")
  })
  it("stopping a session cancels a pending handoff", async () => {
    const { alice, bob, bobId, mod, start } = await setup()
    const session = await start()
    await alice.mutation(api.sessions.offerHandoff, {
      sessionId: session.id,
      deviceId: session.deviceId,
      generation: 1,
      targetAccountId: bobId,
    })
    await mod.mutation(api.sessions.stopAsModerator, { sessionId: session.id })
    await expect(
      bob.mutation(api.sessions.acceptHandoff, {
        sessionId: session.id,
        deviceId: "bob-phone",
        generation: 1,
      }),
    ).rejects.toThrow("SESSION_ENDED")
  })
  it("revoking a referent ends emission and restores public declarations", async () => {
    const { admin, aliceId, groupId, alice, start, observe } = await setup()
    const session = await start()
    await admin.mutation(api.administration.revokeReferent, {
      accountId: aliceId,
      groupId,
    })
    await expect(
      alice.mutation(api.telemetry.ingest, point(session)),
    ).rejects.toThrow("REFERENT_REQUIRED")
    expect(await observe()).toBeTruthy()
  })
  it("logout revokes a still valid JWT, terminates emission and is idempotent", async () => {
    const { alice, start, observe } = await setup()
    const session = await start()
    expect(
      await alice.mutation(api.authSessions.revokeCurrentSession, {}),
    ).toEqual({ revoked: true })
    expect(
      await alice.mutation(api.authSessions.revokeCurrentSession, {}),
    ).toEqual({ revoked: true })
    await expect(
      alice.mutation(api.telemetry.ingest, point(session)),
    ).rejects.toThrow("AUTH_REVOKED")
    expect(await observe()).toBeTruthy()
  })
  it("revokes an identity before its first write and rejects expired sessions", async () => {
    const { t } = await setup()
    const newUser = t.withIdentity(claims("First logout", "f"))
    await newUser.mutation(api.authSessions.revokeCurrentSession, {})
    await expect(newUser.mutation(api.accounts.ensure, {})).rejects.toThrow(
      "AUTH_REVOKED",
    )
    await expect(
      t
        .withIdentity({ ...claims("Expired", "0"), sessionExpiresAt: now })
        .mutation(api.accounts.ensure, {}),
    ).rejects.toThrow("AUTH_EXPIRED")
  })
})
describe("positions, observations and clocks", () => {
  it("deduplicates samples and refuses another device, bad coordinates and backwards samples", async () => {
    const { alice, start, t } = await setup()
    const session = await start()
    const sample = point(session)
    await expect(
      alice.mutation(api.telemetry.ingest, { ...sample, deviceId: "wrong" }),
    ).rejects.toThrow("EMITTER_REVOKED")
    await expect(
      alice.mutation(api.telemetry.ingest, { ...sample, latitude: 91 }),
    ).rejects.toThrow("INVALID_COORDINATES")
    expect(await alice.mutation(api.telemetry.ingest, sample)).toMatchObject({
      accepted: true,
      duplicate: false,
    })
    expect(await alice.mutation(api.telemetry.ingest, sample)).toMatchObject({
      accepted: true,
      duplicate: true,
    })
    vi.setSystemTime(now + 2000)
    await alice.mutation(api.telemetry.ingest, point(session, "new"))
    expect(
      await alice.mutation(
        api.telemetry.ingest,
        point(session, "old", { observedAt: now + 1000 }),
      ),
    ).toMatchObject({ accepted: false, reason: "out_of_order" })
    expect(
      (await t.query(api.catalog.list, {})).groups.find((g) => g.live)?.position
        ?.observedAt,
    ).toBe(now + 2000)
  })
  it("does not use receipt time to rejuvenate delayed GPS", async () => {
    const { t, alice, start } = await setup()
    const session = await start()
    vi.setSystemTime(now + 20_000)
    await alice.mutation(
      api.telemetry.ingest,
      point(session, "late", { observedAt: now }),
    )
    const catalog = await t.query(api.catalog.list, {})
    const p = catalog.groups.find((g) => g.live)?.position ?? null
    expect(positionFreshness(p, catalog.policy, Date.now())).toBe("aging")
    vi.setSystemTime(now + 40_000)
    expect(positionFreshness(p, catalog.policy, Date.now())).toBe("hidden")
  })
  it("rejects impossible timestamps and preserves missing measurement metadata", async () => {
    const { t, alice, start } = await setup()
    const session = await start()
    await expect(
      alice.mutation(
        api.telemetry.ingest,
        point(session, "future", { observedAt: now + 2000 }),
      ),
    ).rejects.toThrow("INVALID_OBSERVATION_TIME")
    const sample = point(session)
    const { accuracyMeters: _accuracyMeters, ...withoutAccuracy } = sample
    await alice.mutation(api.telemetry.ingest, withoutAccuracy)
    const rows = await t.run((ctx) => ctx.db.query("positions").collect())
    expect(rows[0]?.accuracyMeters).toBeUndefined()
    expect(rows[0]?.speedMps).toBeUndefined()
  })
  it("validates current device observations against server time without rejuvenating them on receipt", async () => {
    const { t, publicUser, groupId } = await setup()
    const measurement = {
      groupId,
      requestId: "fresh-device-reading",
      latitude: 16.24,
      longitude: -61.53,
      observedAt: now,
    }
    for (const observedAt of [
      now - policy.maxSampleAgeMs - 1,
      now + policy.maxFutureSkewMs + 1,
      Number.NaN,
    ]) {
      await expect(
        publicUser.mutation(api.observations.create, {
          ...measurement,
          observedAt,
        }),
      ).rejects.toThrow("INVALID_OBSERVATION_TIME")
    }
    expect(
      await t.run((ctx) => ctx.db.query("positions").collect()),
    ).toHaveLength(0)
    vi.setSystemTime(now + 1000)
    const id = await publicUser.mutation(api.observations.create, measurement)
    vi.setSystemTime(now + 2000)
    expect(
      await publicUser.mutation(api.observations.create, measurement),
    ).toBe(id)
    expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({
      source: "community",
      observedAt: now,
      receivedAt: now + 1000,
    })
    const catalog = await t.query(api.catalog.list, {})
    const position =
      catalog.groups.find((group) => group.id === groupId)?.position ?? null
    expect(
      positionFreshness(position, catalog.policy, now + policy.hideAfterMs),
    ).toBe("hidden")
  })
  it("looks up a declaration receipt only within the authenticated account", async () => {
    const { t, publicUser, bob, observe, groupId } = await setup()
    await expect(
      t.query(api.observations.byRequest, { requestId: "observation-1" }),
    ).rejects.toThrow("AUTH_REQUIRED")
    const newcomer = t.withIdentity(claims("New spectator", "f"))
    expect(
      await newcomer.query(api.observations.byRequest, {
        requestId: "observation-1",
      }),
    ).toBeNull()
    const id = await observe()
    expect(
      await publicUser.query(api.observations.byRequest, {
        requestId: "observation-1",
      }),
    ).toEqual({ positionId: id, groupId, observedAt: now })
    expect(
      await bob.query(api.observations.byRequest, {
        requestId: "observation-1",
      }),
    ).toBeNull()
    const ownId = await bob.mutation(api.observations.create, {
      groupId,
      requestId: "observation-1",
      latitude: 16.25,
      longitude: -61.52,
      observedAt: now,
    })
    expect(ownId).not.toBe(id)
    expect(
      await bob.query(api.observations.byRequest, {
        requestId: "observation-1",
      }),
    ).toEqual({ positionId: ownId, groupId, observedAt: now })
    await publicUser.mutation(api.authSessions.revokeCurrentSession, {})
    await expect(
      publicUser.query(api.observations.byRequest, {
        requestId: "observation-1",
      }),
    ).rejects.toThrow("AUTH_REVOKED")
  })
  it("rejects observations while live even when the current point is stale", async () => {
    const { start, observe, alice } = await setup()
    const session = await start()
    vi.setSystemTime(now + 40_000)
    await expect(observe()).rejects.toThrow("GROUP_ALREADY_LIVE")
    await alice.mutation(api.sessions.stop, {
      sessionId: session.id,
      deviceId: session.deviceId,
      generation: 1,
      reason: "manual",
    })
    expect(await observe()).toBeTruthy()
  })
  it("deduplicates public observations and retracts only the selected observation", async () => {
    const { observe, mod, t } = await setup()
    const first = await observe()
    expect(await observe()).toBe(first)
    vi.setSystemTime(now + 1000)
    const second = await observe("observation-2")
    await mod.mutation(api.observations.retract, { positionId: first })
    expect(
      (await t.query(api.catalog.list, {})).groups.find((g) => g.position)
        ?.position?.id,
    ).toBe(second)
  })
  it("preserves historical IDs and explicitly labels received-time-only legacy positions", async () => {
    const { t, groupId } = await setup()
    const legacy = await t.run((ctx) =>
      ctx.db.insert("positions", {
        group: groupId,
        latitude: 16.24,
        longitude: -61.53,
        fromApp: true,
      }),
    )
    const p = (await t.query(api.catalog.list, {})).groups.find(
      (g) => g.id === groupId,
    )?.position
    expect(p).toMatchObject({
      id: legacy,
      source: "legacy",
      timestampBasis: "received",
      observedAt: null,
    })
  })
})
describe("automatic stops", () => {
  it("expires even without a GPS update and an old expiry cannot stop a new session", async () => {
    const { t, alice, groupId, start, observe } = await setup()
    const first = await start()
    await t.finishAllScheduledFunctions(() => vi.runAllTimers())
    expect(
      (await alice.query(api.sessions.mine, {})).sessions.find(
        (x) => x.id === first.id,
      )?.endReason,
    ).toBe("duration")
    expect(await observe()).toBeTruthy()
    const next = await alice.mutation(api.sessions.start, {
      groupId,
      deviceId: "alice-phone",
      requestId: "start-2",
    })
    await t.mutation(internal.sessions.expire, { sessionId: first.id })
    expect(
      (await alice.query(api.sessions.mine, {})).sessions.find(
        (x) => x.id === next.id,
      )?.status,
    ).toBe("active")
  })
  it("guards expiry even before the scheduled job runs", async () => {
    const { alice, start } = await setup()
    const session = await start()
    vi.setSystemTime(now + policy.maxDurationMs)
    expect(
      await alice.mutation(api.telemetry.ingest, point(session)),
    ).toMatchObject({ accepted: false, sessionEnded: true, reason: "duration" })
  })
  it("does not stop on a single outside point, but stops on confirmed outside readings", async () => {
    const { alice, start } = await setup()
    const session = await start()
    expect(
      await alice.mutation(
        api.telemetry.ingest,
        point(session, "outside-1", { latitude: 16.3 }),
      ),
    ).toMatchObject({ accepted: true })
    vi.setSystemTime(now + 10_000)
    await alice.mutation(
      api.telemetry.ingest,
      point(session, "outside-2", { latitude: 16.3 }),
    )
    vi.setSystemTime(now + 20_000)
    expect(
      await alice.mutation(
        api.telemetry.ingest,
        point(session, "outside-3", { latitude: 16.3 }),
      ),
    ).toMatchObject({ accepted: false, sessionEnded: true, reason: "zone" })
  })
  it("warns before stopping for persistent excessive speed", async () => {
    const { alice, start } = await setup()
    const session = await start()
    await alice.mutation(
      api.telemetry.ingest,
      point(session, "fast-1", { speedMps: 20 }),
    )
    vi.setSystemTime(now + 10_000)
    const warning = await alice.mutation(
      api.telemetry.ingest,
      point(session, "fast-2", { speedMps: 20 }),
    )
    expect(warning).toMatchObject({
      accepted: true,
      speedWarningAt: now + 10_000,
    })
    expect(
      await alice.mutation(
        api.telemetry.ingest,
        point(session, "fast-2", { speedMps: 20 }),
      ),
    ).toMatchObject({ duplicate: true, speedWarningAt: now + 10_000 })
    expect(
      (await alice.query(api.sessions.events, { sessionId: session.id })).map(
        (e) => e.type,
      ),
    ).toEqual(["speed_warning"])
    vi.setSystemTime(now + 20_000)
    expect(
      await alice.mutation(
        api.telemetry.ingest,
        point(session, "fast-3", { speedMps: 20 }),
      ),
    ).toMatchObject({ sessionEnded: true, reason: "speed" })
  })
  it("does not infer persistent speed over missing measurements or inaccurate GPS", async () => {
    const { alice, start } = await setup()
    const session = await start()
    await alice.mutation(
      api.telemetry.ingest,
      point(session, "fast", { speedMps: 20 }),
    )
    vi.setSystemTime(now + 20_000)
    await alice.mutation(
      api.telemetry.ingest,
      point(session, "gap", { speedMps: 20 }),
    )
    expect(
      await alice.query(api.sessions.events, { sessionId: session.id }),
    ).toEqual([])
    vi.setSystemTime(now + 25_000)
    expect(
      await alice.mutation(
        api.telemetry.ingest,
        point(session, "imprecise", {
          accuracyMeters: 500,
          speedMps: 20,
          latitude: 17,
        }),
      ),
    ).toMatchObject({ accepted: false, reason: "inaccurate" })
    vi.setSystemTime(now + 30_000)
    expect(
      await alice.mutation(api.telemetry.ingest, point(session, "normal")),
    ).toMatchObject({ sessionEnded: false })
  })
  it("keeps the policy snapshot of an active session", async () => {
    const { admin, alice, start } = await setup()
    const session = await start()
    await admin.mutation(api.administration.setPolicy, {
      policy: { ...policy, maxDurationMs: 5000 },
    })
    vi.setSystemTime(now + 6000)
    expect(
      await alice.mutation(api.telemetry.ingest, point(session)),
    ).toMatchObject({ accepted: true, sessionEnded: false })
  })
})

describe("races and operational views", () => {
  it("shows the current emitter name only to the moderation team, including after handoff", async () => {
    const { t, admin, mod, publicUser, alice, bob, bobId, start } =
      await setup()
    const session = await start()
    await expect(t.query(api.administration.overview, {})).rejects.toThrow(
      "AUTH_REQUIRED",
    )
    await expect(
      publicUser.query(api.administration.overview, {}),
    ).rejects.toThrow("FORBIDDEN")
    await expect(alice.query(api.administration.overview, {})).rejects.toThrow(
      "FORBIDDEN",
    )
    expect(await mod.query(api.administration.overview, {})).toEqual([
      expect.objectContaining({ id: session.id, emitterDisplayName: "Alice" }),
    ])
    await alice.mutation(api.sessions.offerHandoff, {
      sessionId: session.id,
      deviceId: session.deviceId,
      generation: session.generation,
      targetAccountId: bobId,
    })
    await bob.mutation(api.sessions.acceptHandoff, {
      sessionId: session.id,
      deviceId: "bob-phone",
      generation: session.generation,
    })
    expect(await admin.query(api.administration.overview, {})).toEqual([
      expect.objectContaining({
        id: session.id,
        emitterDisplayName: "Bob",
        emitterAccountId: bobId,
      }),
    ])
    expect(JSON.stringify(await t.query(api.catalog.list, {}))).not.toMatch(
      /Alice|Bob|emitterDisplayName|emitterAccountId/,
    )
  })
  it("updates verified display names without granting rights or changing account identifiers", async () => {
    const { t, aliceId, admin } = await setup()
    const renamed = t.withIdentity({
      ...claims("Alice", "b"),
      name: "Alice Martin",
      role: "admin",
    })
    expect(await renamed.mutation(api.accounts.ensure, {})).toBe(aliceId)
    const directory = await admin.query(
      api.administration.readAdminDirectory,
      {},
    )
    expect(
      directory.accounts.find((account) => account.id === aliceId),
    ).toMatchObject({ displayName: "Alice Martin", role: "spectator" })
    await expect(
      renamed.query(api.administration.readAdminDirectory, {}),
    ).rejects.toThrow("FORBIDDEN")
  })
  it("keeps the author and time of grants, revocations, role and policy changes", async () => {
    const { t, admin, adminId, aliceId, groupId, start } = await setup()
    const session = await start()
    await admin.mutation(api.administration.revokeReferent, {
      accountId: aliceId,
      groupId,
    })
    await admin.mutation(api.administration.revokeReferent, {
      accountId: aliceId,
      groupId,
    })
    expect(await t.run((ctx) => ctx.db.get(session.id))).toMatchObject({
      status: "ended",
      endReason: "revoked",
      endedBy: adminId,
    })
    await admin.mutation(api.administration.grantReferent, {
      accountId: aliceId,
      groupId,
    })
    await admin.mutation(api.administration.setRole, {
      accountId: aliceId,
      role: "moderator",
    })
    const events = await t.run((ctx) =>
      ctx.db.query("administrativeEvents").collect(),
    )
    expect(
      events.filter((event) => event.type === "referent_revoked"),
    ).toHaveLength(1)
    expect(events.map((event) => event.type)).toEqual([
      "referent_granted",
      "referent_granted",
      "policy_created",
      "referent_revoked",
      "referent_granted",
      "role_changed",
    ])
    expect(
      events.every(
        (event) => event.actorId === adminId && event.occurredAt === now,
      ),
    ).toBe(true)
    expect(events.at(-1)).toMatchObject({
      accountId: aliceId,
      previousRole: "spectator",
      role: "moderator",
    })
  })
  it("serialises declaration against start without making a community observation the live source", async () => {
    const { t, start, observe, groupId } = await setup()
    const outcomes = await Promise.allSettled([start(), observe()])
    expect(outcomes[0].status).toBe("fulfilled")
    const group = (await t.query(api.catalog.list, {})).groups.find(
      (g) => g.id === groupId,
    )
    expect(group).toMatchObject({
      live: true,
      canObserve: false,
      position: null,
    })
    await expect(observe("after-live")).rejects.toThrow("GROUP_ALREADY_LIVE")
  })
  it("a moderation stop wins over a concurrent handoff", async () => {
    const { alice, bob, bobId, mod, start } = await setup()
    const session = await start()
    await alice.mutation(api.sessions.offerHandoff, {
      sessionId: session.id,
      deviceId: session.deviceId,
      generation: 1,
      targetAccountId: bobId,
    })
    await Promise.allSettled([
      bob.mutation(api.sessions.acceptHandoff, {
        sessionId: session.id,
        deviceId: "bob-phone",
        generation: 1,
      }),
      mod.mutation(api.sessions.stopAsModerator, { sessionId: session.id }),
    ])
    const visible = await bob.query(api.sessions.mine, {})
    expect(visible.sessions.find((s) => s.id === session.id)).toMatchObject({
      status: "ended",
      endReason: "moderation",
    })
  })
  it("rejects conflicting reuse of a start or observation idempotency key", async () => {
    const {
      alice,
      bob,
      admin,
      aliceId,
      groupId,
      otherGroup,
      start,
      observe,
      publicUser,
    } = await setup()
    await start()
    await admin.mutation(api.administration.grantReferent, {
      accountId: aliceId,
      groupId: otherGroup,
    })
    await expect(
      alice.mutation(api.sessions.start, {
        groupId: otherGroup,
        deviceId: "alice-phone",
        requestId: "start-1",
      }),
    ).rejects.toThrow("IDEMPOTENCY_CONFLICT")
    const session = (await bob.query(api.sessions.mine, {})).sessions[0]
    if (!session) throw new Error("missing fixture session")
    await admin.mutation(api.sessions.stopAsModerator, {
      sessionId: session.id,
    })
    await observe()
    await expect(
      publicUser.mutation(api.observations.create, {
        groupId,
        requestId: "observation-1",
        latitude: 16.25,
        longitude: -61.53,
        observedAt: Date.now(),
      }),
    ).rejects.toThrow("IDEMPOTENCY_CONFLICT")
  })
  it("retains the new declaration when a withdrawn current point is replaced concurrently", async () => {
    const { t, mod, observe, groupId } = await setup()
    const old = await observe()
    vi.setSystemTime(now + 1000)
    await Promise.all([
      mod.mutation(api.observations.retract, { positionId: old }),
      observe("new"),
    ])
    const p = (await t.query(api.catalog.list, {})).groups.find(
      (g) => g.id === groupId,
    )?.position
    expect(p?.id).not.toBe(old)
    expect(p?.observedAt).toBe(now + 1000)
  })
  it("does not replace a more recent observation by an older measurement received later", async () => {
    const { t, publicUser, observe, groupId } = await setup()
    vi.setSystemTime(now + 20_000)
    const current = await observe()
    await publicUser.mutation(api.observations.create, {
      groupId,
      requestId: "older",
      latitude: 16.2,
      longitude: -61.5,
      observedAt: now,
    })
    expect(
      (await t.query(api.catalog.list, {})).groups.find((g) => g.id === groupId)
        ?.position?.id,
    ).toBe(current)
  })
  it("limits the moderation feed and shares the minimal directory with moderators", async () => {
    const { admin, mod, publicUser, observe, start } = await setup()
    await observe()
    const session = await start()
    await mod.mutation(api.sessions.stopAsModerator, { sessionId: session.id })
    const directory = await admin.query(
      api.administration.readAdminDirectory,
      {},
    )
    expect(directory.accounts).toHaveLength(5)
    expect(JSON.stringify(directory)).not.toMatch(
      /sid|issuer|subject|tokenIdentifier|pushToken/,
    )
    expect(await mod.query(api.administration.readAdminDirectory, {})).toEqual(
      directory,
    )
    await expect(
      publicUser.query(api.administration.readAdminDirectory, {}),
    ).rejects.toThrow("FORBIDDEN")
    await expect(
      publicUser.query(api.administration.moderationQueue, {}),
    ).rejects.toThrow("FORBIDDEN")
    const feed = await mod.query(api.administration.moderationQueue, {
      limit: 1,
    })
    expect(feed.observations).toHaveLength(1)
    expect(feed.events).toHaveLength(1)
    expect(feed.events[0]).toMatchObject({
      groupTitle: "Groupe témoin",
      type: "ended",
      reason: "moderation",
    })
    await expect(
      mod.query(api.administration.moderationQueue, { limit: 101 }),
    ).rejects.toThrow("INVALID_LIMIT")
  })
  it("seeds an optional local moderator idempotently without replacing existing roles", async () => {
    const t = convexTest(schema, modules)
    const fixtureArgs = {
      issuer: "http://localhost:3000",
      adminSubject: "simulation-admin",
      moderatorSubject: "simulation-moderator",
      referentSubject: "simulation-referent",
      otherReferentSubject: "simulation-other-referent",
      spectatorSubject: "simulation-spectator",
    }
    vi.stubEnv("ALLOW_LOCAL_FIXTURES", "true")
    vi.stubEnv("AUTH_ISSUER_URL", fixtureArgs.issuer)
    try {
      const first = await t.mutation(
        internal.localFixtures.seedScenario,
        fixtureArgs,
      )
      const moderatorId = first.accounts.moderator
      if (!moderatorId) throw new Error("missing fixture moderator")
      expect(await t.run((ctx) => ctx.db.get(moderatorId))).toMatchObject({
        displayName: "[SIMULATION] moderator",
        role: "moderator",
      })
      expect(
        await t.mutation(internal.localFixtures.seedScenario, fixtureArgs),
      ).toEqual(first)
      await t.run((ctx) => ctx.db.patch(moderatorId, { role: "spectator" }))
      await t.mutation(internal.localFixtures.seedScenario, fixtureArgs)
      expect((await t.run((ctx) => ctx.db.get(moderatorId)))?.role).toBe(
        "spectator",
      )
      await expect(
        t.mutation(internal.localFixtures.seedScenario, {
          ...fixtureArgs,
          moderatorSubject: fixtureArgs.adminSubject,
        }),
      ).rejects.toThrow("FIXTURE_SUBJECTS_MUST_DIFFER")
      const { moderatorSubject: _moderatorSubject, ...legacyArgs } = fixtureArgs
      const legacy = await t.mutation(
        internal.localFixtures.seedScenario,
        legacyArgs,
      )
      expect(legacy.accounts.moderator).toBeUndefined()
      expect(legacy.groupId).toBe(first.groupId)
      expect(
        await t.run((ctx) => ctx.db.query("accounts").collect()),
      ).toHaveLength(5)
    } finally {
      vi.unstubAllEnvs()
    }
  })
  it("does not provision local simulation data when the local guard is absent", async () => {
    const { t } = await setup()
    await expect(
      t.mutation(internal.localFixtures.seedScenario, {
        issuer: "https://example.com",
        adminSubject: "a",
        referentSubject: "b",
        otherReferentSubject: "c",
        spectatorSubject: "d",
      }),
    ).rejects.toThrow("LOCAL_FIXTURES_DISABLED")
  })
})
