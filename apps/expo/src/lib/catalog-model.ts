import type { PublicCatalog, PublicGroup, PublicPosition } from "@oyo/convex"
import { positionFreshness } from "@oyo/convex"

export interface CachedCatalog {
  version: 1
  savedAt: number
  data: PublicCatalog
}
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null
function validPosition(value: unknown): boolean {
  return (
    value === null ||
    (record(value) &&
      typeof value.id === "string" &&
      finite(value.latitude) &&
      Math.abs(value.latitude) <= 90 &&
      finite(value.longitude) &&
      Math.abs(value.longitude) <= 180 &&
      ["referent", "community", "legacy"].includes(String(value.source)) &&
      (value.observedAt === null || finite(value.observedAt)) &&
      finite(value.receivedAt) &&
      ["observed", "received"].includes(String(value.timestampBasis)))
  )
}
export function parseCachedCatalog(raw: string | null): CachedCatalog | null {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (
      !record(value) ||
      value.version !== 1 ||
      !finite(value.savedAt) ||
      !record(value.data)
    )
      return null
    const data = value.data
    if (!finite(data.serverNow) || !Array.isArray(data.groups)) return null
    if (
      data.policy !== null &&
      (!record(data.policy) ||
        !finite(data.policy.freshForMs) ||
        !finite(data.policy.hideAfterMs) ||
        data.policy.freshForMs <= 0 ||
        data.policy.hideAfterMs <= data.policy.freshForMs)
    )
      return null
    if (
      !data.groups.every(
        (group: unknown) =>
          record(group) &&
          typeof group.id === "string" &&
          typeof group.title === "string" &&
          typeof group.live === "boolean" &&
          typeof group.canObserve === "boolean" &&
          validPosition(group.position),
      )
    )
      return null
    return value as unknown as CachedCatalog
  } catch {
    return null
  }
}
export function catalogTime(snapshot: CachedCatalog, localNow: number) {
  return snapshot.data.serverNow + Math.max(0, localNow - snapshot.savedAt)
}
export function visiblePosition(
  group: PublicGroup,
  catalog: PublicCatalog,
  now: number,
) {
  const freshness = positionFreshness(group.position, catalog.policy, now)
  return freshness === "recent" || freshness === "aging" ? group.position : null
}
export function positionLabel(
  group: PublicGroup,
  catalog: PublicCatalog,
  now: number,
) {
  const freshness = positionFreshness(group.position, catalog.policy, now)
  if (freshness === "absent")
    return group.live ? "En attente d’un point" : "Pas de position"
  if (freshness === "unconfigured") return "Position indisponible"
  if (freshness === "hidden") return "Position trop ancienne"
  if (freshness === "aging") return "Position ancienne"
  return group.live && group.position?.source === "referent"
    ? "En direct"
    : group.position?.source === "community"
      ? "Signalée par le public"
      : "Dernier point connu"
}
export function ageLabel(position: PublicPosition, now: number) {
  const age = Math.max(0, now - (position.observedAt ?? position.receivedAt))
  if (age < 60_000) return "il y a moins d’une minute"
  const minutes = Math.floor(age / 60_000)
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  return hours < 24
    ? `il y a ${hours} h ${minutes % 60} min`
    : `le ${new Date(position.observedAt ?? position.receivedAt).toLocaleDateString("fr-FR")}`
}
export function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .trim()
}
export function navigationUrl(
  position: Pick<PublicPosition, "latitude" | "longitude">,
  platform: string,
) {
  const coordinates = `${position.latitude},${position.longitude}`
  return platform === "ios"
    ? `https://maps.apple.com/?daddr=${coordinates}&dirflg=w`
    : `https://www.google.com/maps/dir/?api=1&destination=${coordinates}&travelmode=walking`
}
