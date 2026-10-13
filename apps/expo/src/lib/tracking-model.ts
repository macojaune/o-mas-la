import type { Id } from "@oyo/convex"

export type StopReason = "manual" | "gps_failed" | "logout"
export interface TrackingRecord {
  sessionId: Id<"liveSessions">
  groupId: Id<"groups">
  deviceId: string
  generation: number
  expiresAt: number
  pendingStop?: StopReason
}
export function parseTracking(raw: string | null): TrackingRecord | null {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== "object" || !value) return null
    const record = value as Record<string, unknown>
    if (
      typeof record.sessionId !== "string" ||
      !record.sessionId ||
      typeof record.groupId !== "string" ||
      !record.groupId ||
      typeof record.deviceId !== "string" ||
      !record.deviceId ||
      typeof record.generation !== "number" ||
      !Number.isSafeInteger(record.generation) ||
      record.generation < 1 ||
      typeof record.expiresAt !== "number" ||
      !Number.isFinite(record.expiresAt) ||
      (record.pendingStop !== undefined &&
        (typeof record.pendingStop !== "string" ||
          !["manual", "gps_failed", "logout"].includes(record.pendingStop)))
    )
      return null
    return record as unknown as TrackingRecord
  } catch {
    return null
  }
}
export function canTransmit(
  record: TrackingRecord | null,
  now: number,
  expected?: TrackingRecord,
): boolean {
  return (
    !!record &&
    !record.pendingStop &&
    now < record.expiresAt &&
    (!expected ||
      (record.sessionId === expected.sessionId &&
        record.deviceId === expected.deviceId &&
        record.generation === expected.generation))
  )
}

/** All writers which start a native session must use run(). A delayed response may only stop its own generation. */
export function createTrackingTransitions(
  read: () => Promise<TrackingRecord | null>,
  stopNative: () => Promise<void>,
  clear: () => Promise<void>,
) {
  let tail: Promise<void> = Promise.resolve()
  function run<T>(action: () => Promise<T>): Promise<T> {
    const next = tail.then(action, action)
    tail = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }
  function stopIfCurrent(
    expected: TrackingRecord | null,
    remove = true,
    afterStop?: () => Promise<unknown>,
  ) {
    return run(async () => {
      const current = await read()
      if (
        expected
          ? !current ||
            current.sessionId !== expected.sessionId ||
            current.deviceId !== expected.deviceId ||
            current.generation !== expected.generation
          : current !== null
      )
        return false
      await stopNative()
      try {
        // Keep the transition locked so another generation cannot start before its predecessor's alert is scheduled.
        await afterStop?.()
      } finally {
        if (remove && current) await clear()
      }
      return true
    })
  }
  return { run, stopIfCurrent }
}
