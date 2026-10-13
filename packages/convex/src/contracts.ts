import type { Id } from "../convex/_generated/dataModel"

export type AccountRole = "spectator" | "moderator" | "admin"
export interface FreshnessPolicy {
  freshForMs: number
  hideAfterMs: number
}
export type PositionFreshness =
  | "absent"
  | "unconfigured"
  | "recent"
  | "aging"
  | "hidden"
export interface PublicPosition {
  id: Id<"positions">
  latitude: number
  longitude: number
  source: "referent" | "community" | "legacy"
  observedAt: number | null
  receivedAt: number
  timestampBasis: "observed" | "received"
}
export interface PublicGroup {
  id: Id<"groups">
  title: string
  live: boolean
  canObserve: boolean
  position: PublicPosition | null
}
export interface PublicCatalog {
  serverNow: number
  policy: FreshnessPolicy | null
  groups: PublicGroup[]
}
export type EndReason =
  | "manual"
  | "moderation"
  | "gps_failed"
  | "logout"
  | "duration"
  | "zone"
  | "speed"
  | "revoked"
export interface SessionView {
  id: Id<"liveSessions">
  groupId: Id<"groups">
  status: "active" | "ended"
  deviceId: string
  generation: number
  startedAt: number
  expiresAt: number
  endedAt?: number
  endReason?: EndReason
  emitterAccountId: Id<"accounts">
  isEmitter: boolean
  handoffToAccountId?: Id<"accounts">
  speedWarningAt?: number
}
export interface TrackingPolicy extends FreshnessPolicy {
  maxDurationMs: number
  maxFutureSkewMs: number
  maxSampleAgeMs: number
  maxAccuracyMeters: number
  zone: {
    latitude: number
    longitude: number
    radiusMeters: number
    confirmationMs: number
  }
  speed: {
    thresholdMps: number
    persistenceMs: number
    warningMs: number
    maxGapMs: number
  }
}

/** `now` must advance even while offline; timestamps are never refreshed by receipt of a cached snapshot. */
export function positionFreshness(
  position: PublicPosition | null,
  policy: FreshnessPolicy | null,
  now: number,
): PositionFreshness {
  if (!position) return "absent"
  if (!policy) return "unconfigured"
  const age = Math.max(0, now - (position.observedAt ?? position.receivedAt))
  if (age >= policy.hideAfterMs) return "hidden"
  return age >= policy.freshForMs ? "aging" : "recent"
}
