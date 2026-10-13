import { describe, expect, it } from "vitest"

import type { Id, PublicCatalog } from "@oyo/convex"

import type { TrackingRecord } from "./tracking-model"
import {
  ageLabel,
  catalogTime,
  navigationUrl,
  normalizeSearch,
  parseCachedCatalog,
  positionLabel,
  visiblePosition,
} from "./catalog-model"
import {
  canTransmit,
  createTrackingTransitions,
  parseTracking,
} from "./tracking-model"

// Fictional data exclusively for testing. Thresholds are deliberately tiny to exercise boundaries.
const serverNow = 1_700_000_000_000
const catalog: PublicCatalog = {
  serverNow,
  policy: { freshForMs: 60_000, hideAfterMs: 180_000 },
  groups: [
    {
      id: "fictional-group" as Id<"groups">,
      title: "Groupe fictif Élan",
      live: true,
      canObserve: false,
      position: {
        id: "fictional-position" as Id<"positions">,
        latitude: 16.24,
        longitude: -61.53,
        source: "referent",
        observedAt: serverNow,
        receivedAt: serverNow,
        timestampBasis: "observed",
      },
    },
  ],
}
const group = catalog.groups[0]
if (!group?.position) throw new Error("Test fixture is incomplete")
const point = group.position
const snapshot = {
  version: 1 as const,
  savedAt: serverNow + 123_000,
  data: catalog,
}

describe("public snapshot without network or account", () => {
  it("preserves server time despite the phone's initial clock offset, then ages after restart", () => {
    expect(catalogTime(snapshot, snapshot.savedAt)).toBe(serverNow)
    const restored = parseCachedCatalog(JSON.stringify(snapshot))
    if (!restored) throw new Error("Valid test cache must parse")
    const now = catalogTime(restored, snapshot.savedAt + 180_000)
    expect(now).toBe(serverNow + 180_000)
    expect(visiblePosition(group, restored.data, now)).toBeNull()
    expect(restored.data.groups).toHaveLength(1)
  })
  it("changes the visible state at both exact freshness boundaries", () => {
    expect(positionLabel(group, catalog, serverNow + 59_999)).toBe("En direct")
    expect(positionLabel(group, catalog, serverNow + 60_000)).toBe(
      "Position ancienne",
    )
    expect(visiblePosition(group, catalog, serverNow + 179_999)).toEqual(
      group.position,
    )
    expect(visiblePosition(group, catalog, serverNow + 180_000)).toBeNull()
  })
  it("never presents an unconfigured position as current and uses received time for legacy records", () => {
    expect(
      visiblePosition(group, { ...catalog, policy: null }, serverNow),
    ).toBeNull()
    const legacy = {
      ...group,
      live: false,
      position: {
        ...point,
        source: "legacy" as const,
        observedAt: null,
      },
    }
    expect(ageLabel(legacy.position, serverNow + 120_000)).toBe("il y a 2 min")
    expect(positionLabel(legacy, catalog, serverNow)).toBe(
      "Dernier point connu",
    )
  })
  it.each([
    "{",
    "null",
    JSON.stringify({ ...snapshot, version: 0 }),
    JSON.stringify({
      ...snapshot,
      data: { ...catalog, policy: { freshForMs: 100, hideAfterMs: 50 } },
    }),
    JSON.stringify({
      ...snapshot,
      data: {
        ...catalog,
        groups: [{ ...group, position: { ...group.position, latitude: 100 } }],
      },
    }),
  ])("ignores corrupt or obsolete cache %s", (raw) => {
    expect(parseCachedCatalog(raw)).toBeNull()
  })
  it("finds names without accents and builds walking destinations without reading spectator GPS", () => {
    expect(normalizeSearch(group.title)).toContain(normalizeSearch(" ELAN "))
    expect(navigationUrl(point, "ios")).toBe(
      "https://maps.apple.com/?daddr=16.24,-61.53&dirflg=w",
    )
    expect(navigationUrl(point, "android")).toContain(
      "destination=16.24,-61.53&travelmode=walking",
    )
  })
})
describe("stored emitter never resumes automatically after a terminal condition", () => {
  const record = {
    sessionId: "fictional-session" as Id<"liveSessions">,
    groupId: group.id,
    deviceId: "fictional-device",
    generation: 2,
    expiresAt: serverNow + 60_000,
  }
  it("accepts valid metadata but rejects corruption", () => {
    expect(parseTracking(JSON.stringify(record))).toEqual(record)
    expect(
      parseTracking(JSON.stringify({ ...record, generation: 1.5 })),
    ).toBeNull()
    expect(
      parseTracking(JSON.stringify({ ...record, pendingStop: "unknown" })),
    ).toBeNull()
  })
  it("blocks transmission on logout, expiry, missing state or handoff generation change", () => {
    expect(canTransmit(record, serverNow)).toBe(true)
    expect(canTransmit({ ...record, pendingStop: "logout" }, serverNow)).toBe(
      false,
    )
    expect(canTransmit(record, record.expiresAt)).toBe(false)
    expect(canTransmit(null, serverNow)).toBe(false)
    expect(canTransmit({ ...record, generation: 3 }, serverNow, record)).toBe(
      false,
    )
    expect(
      canTransmit({ ...record, deviceId: "other-device" }, serverNow, record),
    ).toBe(false)
  })
})

describe("delayed server response after a new emitter starts", () => {
  it("cannot stop or clear the newer generation, including while its native start is awaiting", async () => {
    const old: TrackingRecord = {
      sessionId: "fictional-session" as Id<"liveSessions">,
      groupId: group.id,
      deviceId: "phone",
      generation: 1,
      expiresAt: serverNow + 60_000,
    }
    const newer = { ...old, generation: 2 }
    let stored: TrackingRecord | null = old
    let stopped = 0
    const transitions = createTrackingTransitions(
      () => Promise.resolve(stored),
      () => {
        stopped++
        return Promise.resolve()
      },
      () => {
        stored = null
        return Promise.resolve()
      },
    )
    let finishNativeStart: () => void = () => {
      throw new Error("Start was not scheduled")
    }
    const nativeStart = new Promise<void>((resolve) => {
      finishNativeStart = resolve
    })
    const starting = transitions.run(async () => {
      stored = newer
      await nativeStart
    })
    const lateTerminalResponse = transitions.stopIfCurrent(old)
    finishNativeStart()
    await starting
    expect(await lateTerminalResponse).toBe(false)
    expect(stored).toEqual(newer)
    expect(stopped).toBe(0)
    expect(await transitions.stopIfCurrent(newer)).toBe(true)
    expect(stopped).toBe(1)
    expect(stored).toBeNull()
  })
})
