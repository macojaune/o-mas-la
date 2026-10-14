import { afterEach, describe, expect, it, vi } from "vitest"

import {
  OBSERVATION_ACQUISITION_TIMEOUT_MS,
  publishCurrentObservation,
} from "./current-observation"

type Ports = Parameters<typeof publishCurrentObservation>[0]
const now = 1_800_000_000_000
const fresh = { timestamp: now, coords: { latitude: 16.24, longitude: -61.53 } }
function setup(overrides: Partial<Ports> = {}) {
  return {
    groupId: overrides.groupId ?? "fictional-group",
    now: overrides.now ?? (() => now),
    isActive: overrides.isActive ?? (() => true),
    canObserve: overrides.canObserve ?? (() => true),
    ensureConnection: vi.fn(
      overrides.ensureConnection ?? (() => Promise.resolve()),
    ),
    findReceipt: vi.fn<Ports["findReceipt"]>(
      overrides.findReceipt ?? (() => Promise.resolve(null)),
    ),
    requestPermission: vi.fn(
      overrides.requestPermission ??
        (() => Promise.resolve({ granted: true, canAskAgain: true })),
    ),
    locate: vi.fn(overrides.locate ?? (() => Promise.resolve(fresh))),
    publish: vi.fn<Ports["publish"]>(
      overrides.publish ?? (() => Promise.resolve()),
    ),
    onPhase: vi.fn<Ports["onPhase"]>(overrides.onPhase),
  }
}
afterEach(() => vi.useRealTimers())

describe("current phone observation, requested only by a publication gesture", () => {
  it("publishes the newly acquired coordinates and acquisition time, with a network recheck", async () => {
    const ports = setup()
    await publishCurrentObservation(ports)
    expect(ports.publish).toHaveBeenCalledExactlyOnceWith({
      latitude: 16.24,
      longitude: -61.53,
      observedAt: now,
    })
    expect(ports.ensureConnection).toHaveBeenCalledTimes(2)
    expect(ports.onPhase.mock.calls.flat()).toEqual([
      "checking",
      "permission",
      "locating",
      "publishing",
    ])
  })
  it("blocks offline before requesting permission or GPS and never queues a publication", async () => {
    const ports = setup({
      ensureConnection: () => Promise.reject(new Error("offline")),
    })
    await expect(publishCurrentObservation(ports)).rejects.toThrow("offline")
    expect(ports.requestPermission).not.toHaveBeenCalled()
    expect(ports.locate).not.toHaveBeenCalled()
    expect(ports.publish).not.toHaveBeenCalled()
  })
  it.each([
    [true, "permission"],
    [false, "settings"],
  ])(
    "handles denied permission (canAskAgain=%s) without reading GPS",
    async (canAskAgain, code) => {
      const ports = setup({
        requestPermission: () =>
          Promise.resolve({ granted: false, canAskAgain }),
      })
      await expect(publishCurrentObservation(ports)).rejects.toMatchObject({
        code,
      })
      expect(ports.locate).not.toHaveBeenCalled()
      expect(ports.publish).not.toHaveBeenCalled()
    },
  )
  it("blocks a live group before requesting location", async () => {
    const ports = setup({ canObserve: () => false })
    await expect(publishCurrentObservation(ports)).rejects.toMatchObject({
      code: "live",
    })
    expect(ports.requestPermission).not.toHaveBeenCalled()
    expect(ports.publish).not.toHaveBeenCalled()
  })
  it("refuses a live that starts during GPS acquisition", async () => {
    let live = false
    const ports = setup({
      canObserve: () => !live,
      locate: () => {
        live = true
        return Promise.resolve(fresh)
      },
    })
    await expect(publishCurrentObservation(ports)).rejects.toMatchObject({
      code: "live",
    })
    expect(ports.publish).not.toHaveBeenCalled()
  })
  it.each([now - 1_001, now + 5_001, Number.NaN])(
    "rejects an old, future or invalid GPS timestamp %s instead of redating it",
    async (timestamp) => {
      const ports = setup({
        locate: () => Promise.resolve({ ...fresh, timestamp }),
      })
      await expect(publishCurrentObservation(ports)).rejects.toMatchObject({
        code: "stale",
      })
      expect(ports.publish).not.toHaveBeenCalled()
    },
  )
  it("rechecks age after slow authentication and never sends a fix older than 10 seconds", async () => {
    let clock = now
    let connections = 0
    const ports = setup({
      now: () => clock,
      ensureConnection: () => {
        if (++connections === 2) clock += 10_001
        return Promise.resolve()
      },
    })
    await expect(publishCurrentObservation(ports)).rejects.toMatchObject({
      code: "stale",
    })
    expect(ports.publish).not.toHaveBeenCalled()
  })
  it("abandons the point if connection is lost during acquisition", async () => {
    let online = true
    const ports = setup({
      ensureConnection: () =>
        online ? Promise.resolve() : Promise.reject(new Error("offline")),
      locate: () => {
        online = false
        return Promise.resolve(fresh)
      },
    })
    await expect(publishCurrentObservation(ports)).rejects.toThrow("offline")
    online = true
    expect(ports.publish).not.toHaveBeenCalled()
  })
  it("ignores a GPS result arriving after timeout, without later automatic publication", async () => {
    vi.useFakeTimers()
    let resolveLocation: (fix: typeof fresh) => void = () => undefined
    const ports = setup({
      locate: () =>
        new Promise((resolve) => {
          resolveLocation = resolve
        }),
    })
    const submission = publishCurrentObservation(ports)
    const rejection = expect(submission).rejects.toMatchObject({
      code: "location",
    })
    await vi.advanceTimersByTimeAsync(OBSERVATION_ACQUISITION_TIMEOUT_MS)
    await rejection
    resolveLocation(fresh)
    await vi.runAllTimersAsync()
    expect(ports.publish).not.toHaveBeenCalled()
  })
  it("abandons acquisition when the screen or authenticated account changes", async () => {
    let active = true
    const ports = setup({
      isActive: () => active,
      locate: () => {
        active = false
        return Promise.resolve(fresh)
      },
    })
    await expect(publishCurrentObservation(ports)).rejects.toMatchObject({
      code: "cancelled",
    })
    expect(ports.publish).not.toHaveBeenCalled()
  })
})

describe("lost acknowledgement never leads to a duplicate or old GPS reuse", () => {
  const receipt = { groupId: "fictional-group", observedAt: now - 60_000 }
  it("confirms a previous publication before permissions, even if a live has since started", async () => {
    const ports = setup({
      canObserve: () => false,
      findReceipt: () => Promise.resolve(receipt),
    })
    await publishCurrentObservation(ports)
    expect(ports.requestPermission).not.toHaveBeenCalled()
    expect(ports.publish).not.toHaveBeenCalled()
  })
  it("acquires a new position on the next explicit attempt when no publication was recorded", async () => {
    let clock = now
    const ports = setup({ now: () => clock })
    ports.publish.mockRejectedValueOnce(new Error("lost response"))
    await expect(publishCurrentObservation(ports)).rejects.toThrow(
      "lost response",
    )
    clock += 60_000
    ports.locate.mockResolvedValueOnce({
      timestamp: clock,
      coords: { latitude: 16.25, longitude: -61.54 },
    })
    await publishCurrentObservation(ports)
    expect(ports.publish).toHaveBeenLastCalledWith({
      latitude: 16.25,
      longitude: -61.54,
      observedAt: clock,
    })
    expect(ports.locate).toHaveBeenCalledTimes(2)
  })
  it("confirms the first publication if it commits during the second acquisition", async () => {
    const ports = setup()
    ports.findReceipt.mockResolvedValueOnce(null).mockResolvedValueOnce(receipt)
    ports.publish.mockRejectedValueOnce(new Error("IDEMPOTENCY_CONFLICT"))
    await publishCurrentObservation(ports)
    expect(ports.publish).toHaveBeenCalledTimes(1)
    expect(ports.findReceipt).toHaveBeenCalledTimes(2)
  })
  it("never treats a receipt for another group as confirmation", async () => {
    const ports = setup({
      findReceipt: () =>
        Promise.resolve({ ...receipt, groupId: "another-group" }),
    })
    ports.publish.mockRejectedValueOnce(new Error("IDEMPOTENCY_CONFLICT"))
    await expect(publishCurrentObservation(ports)).rejects.toThrow(
      "IDEMPOTENCY_CONFLICT",
    )
  })
})
