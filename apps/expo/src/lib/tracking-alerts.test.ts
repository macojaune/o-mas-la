import { describe, expect, it } from "vitest"

import type { Id } from "@oyo/convex"

import type { TrackingAlert } from "./tracking-alerts"
import type { TrackingRecord } from "./tracking-model"
import {
  createTrackingAlertDelivery,
  speedWarningAlert,
  stopTrackingFromServer,
  zoneEndedAlert,
} from "./tracking-alerts"
import { createTrackingTransitions } from "./tracking-model"

// Explicitly fictional metadata; no native notification is sent by these tests.
const record: TrackingRecord = {
  sessionId: "fictional-session" as Id<"liveSessions">,
  groupId: "fictional-group" as Id<"groups">,
  deviceId: "fictional-phone",
  generation: 1,
  expiresAt: 2_000_000_000_000,
}
function notificationHarness(permitted = true) {
  const storage = new Map<string, string>()
  const delivered: TrackingAlert[] = []
  const deliver = createTrackingAlertDelivery({
    read: (key) => Promise.resolve(storage.get(key) ?? null),
    write: (key, value) => {
      storage.set(key, value)
      return Promise.resolve()
    },
    permitted: () => Promise.resolve(permitted),
    schedule: (alert) => {
      delivered.push(alert)
      return Promise.resolve()
    },
  })
  return { deliver, delivered, storage }
}
describe("tracking notifications respect the confirmed session and consent", () => {
  it("notifies a confirmed zone stop once, including concurrent duplicate callbacks", async () => {
    const { deliver, delivered } = notificationHarness()
    const alert = zoneEndedAlert(record)
    expect(await Promise.all([deliver(alert), deliver(alert)])).toEqual([
      true,
      false,
    ])
    expect(delivered).toHaveLength(1)
    expect(delivered[0]?.title).toBe("Suivi arrêté : sortie de zone")
    expect(delivered[0]?.body).toContain("n’est plus partagée")
  })
  it("keeps speed warnings distinct from zone ends and deduplicates each server warning", async () => {
    const { deliver, delivered } = notificationHarness()
    expect(await deliver(speedWarningAlert(record, 100))).toBe(true)
    expect(await deliver(speedWarningAlert(record, 100))).toBe(false)
    expect(await deliver(speedWarningAlert(record, 200))).toBe(true)
    expect(await deliver(zoneEndedAlert(record))).toBe(true)
    expect(delivered).toHaveLength(3)
    expect(delivered[0]?.title).toContain("Vitesse élevée")
  })
  it("does not schedule notifications when the existing permission is denied", async () => {
    const { deliver, delivered, storage } = notificationHarness(false)
    expect(await deliver(zoneEndedAlert(record))).toBe(false)
    expect(await deliver(speedWarningAlert(record, 100))).toBe(false)
    expect(delivered).toEqual([])
    expect(storage.size).toBe(0)
  })
  it("ignores an old live response and alerts only after the current generation is stopped", async () => {
    const { deliver, delivered } = notificationHarness()
    const newer = { ...record, generation: 2 }
    let current: TrackingRecord | null = newer
    const order: string[] = []
    const transitions = createTrackingTransitions(
      () => Promise.resolve(current),
      () => {
        order.push("stop")
        return Promise.resolve()
      },
      () => {
        order.push("clear")
        current = null
        return Promise.resolve()
      },
    )
    expect(
      await transitions.stopIfCurrent(record, true, () =>
        deliver(zoneEndedAlert(record)),
      ),
    ).toBe(false)
    expect(delivered).toEqual([])
    expect(current).toEqual(newer)
    expect(
      await transitions.stopIfCurrent(newer, true, async () => {
        order.push("notify")
        await deliver(zoneEndedAlert(newer))
      }),
    ).toBe(true)
    expect(order).toEqual(["stop", "notify", "clear"])
    expect(delivered).toHaveLength(1)
    expect(current).toBeNull()
  })
  it("clears stopped metadata even if the operating system rejects notification delivery", async () => {
    let current: TrackingRecord | null = record
    const transitions = createTrackingTransitions(
      () => Promise.resolve(current),
      () => Promise.resolve(),
      () => {
        current = null
        return Promise.resolve()
      },
    )
    await expect(
      transitions.stopIfCurrent(record, true, () =>
        Promise.reject(new Error("OS rejected")),
      ),
    ).rejects.toThrow("OS rejected")
    expect(current).toBeNull()
  })
})

describe("terminal zone notifications across both server channels", () => {
  it("notifies once when session reconciliation wins the race against the GPS response", async () => {
    const { deliver, delivered } = notificationHarness()
    let current: TrackingRecord | null = record
    const transitions = createTrackingTransitions(
      () => Promise.resolve(current),
      () => Promise.resolve(),
      () => {
        current = null
        return Promise.resolve()
      },
    )
    const notifyZone = (value: TrackingRecord) => deliver(zoneEndedAlert(value))
    const reconciliation = stopTrackingFromServer(
      record,
      "zone",
      transitions.stopIfCurrent,
      notifyZone,
    )
    const gpsResponse = stopTrackingFromServer(
      record,
      "zone",
      transitions.stopIfCurrent,
      notifyZone,
    )
    expect(await Promise.all([reconciliation, gpsResponse])).toEqual([
      true,
      false,
    ])
    expect(delivered).toHaveLength(1)
  })
  it("still notifies if reconciliation is the only confirmation after a lost GPS response", async () => {
    const { deliver, delivered } = notificationHarness()
    let current: TrackingRecord | null = record
    const transitions = createTrackingTransitions(
      () => Promise.resolve(current),
      () => Promise.resolve(),
      () => {
        current = null
        return Promise.resolve()
      },
    )
    expect(
      await stopTrackingFromServer(
        record,
        "zone",
        transitions.stopIfCurrent,
        (value) => deliver(zoneEndedAlert(value)),
      ),
    ).toBe(true)
    expect(delivered).toHaveLength(1)
    expect(current).toBeNull()
  })
  it("does not label another terminal reason as a zone stop", async () => {
    const { deliver, delivered } = notificationHarness()
    let current: TrackingRecord | null = record
    const transitions = createTrackingTransitions(
      () => Promise.resolve(current),
      () => Promise.resolve(),
      () => {
        current = null
        return Promise.resolve()
      },
    )
    expect(
      await stopTrackingFromServer(
        record,
        "duration",
        transitions.stopIfCurrent,
        (value) => deliver(zoneEndedAlert(value)),
      ),
    ).toBe(true)
    expect(delivered).toEqual([])
  })
})
