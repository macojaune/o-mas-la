/** Acquisition limits, not the catalogue's field-calibrated freshness policy. */
export const OBSERVATION_ACQUISITION_TIMEOUT_MS = 25_000
const MAX_FIX_AGE_MS = 10_000
const TIMESTAMP_ROUNDING_MS = 1_000
const MAX_FUTURE_SKEW_MS = 5_000

interface LocationFix {
  timestamp: number
  coords: { latitude: number; longitude: number }
}
export interface CurrentObservation {
  latitude: number
  longitude: number
  observedAt: number
}
interface Receipt {
  groupId: string
  observedAt: number | null
}
type ObservationFailure =
  | "permission"
  | "settings"
  | "location"
  | "stale"
  | "live"
  | "cancelled"

export class ObservationError extends Error {
  constructor(readonly code: ObservationFailure) {
    super(code)
  }
}

interface Ports {
  groupId: string
  now: () => number
  isActive: () => boolean
  canObserve: () => boolean
  ensureConnection: () => Promise<void>
  findReceipt: () => Promise<Receipt | null>
  requestPermission: () => Promise<{ granted: boolean; canAskAgain: boolean }>
  locate: () => Promise<LocationFix>
  publish: (observation: CurrentObservation) => Promise<void>
  onPhase: (
    phase: "checking" | "permission" | "locating" | "publishing",
  ) => void
}

function validateFix(fix: LocationFix, startedAt: number, now: number) {
  if (
    !Number.isFinite(fix.timestamp) ||
    fix.timestamp < startedAt - TIMESTAMP_ROUNDING_MS ||
    fix.timestamp < now - MAX_FIX_AGE_MS ||
    fix.timestamp > now + MAX_FUTURE_SKEW_MS ||
    !Number.isFinite(fix.coords.latitude) ||
    !Number.isFinite(fix.coords.longitude) ||
    Math.abs(fix.coords.latitude) > 90 ||
    Math.abs(fix.coords.longitude) > 180
  )
    throw new ObservationError("stale")
}

/** One deliberate gesture; no cached GPS and no automatic publication retry. */
export async function publishCurrentObservation(ports: Ports) {
  const active = () => {
    if (!ports.isActive()) throw new ObservationError("cancelled")
  }
  const available = () => {
    active()
    if (!ports.canObserve()) throw new ObservationError("live")
  }
  const confirmed = (receipt: Receipt | null) =>
    receipt?.groupId === ports.groupId

  active()
  ports.onPhase("checking")
  await ports.ensureConnection()
  active()
  // A lost acknowledgement must be checked before acquiring or publishing anew.
  const previous = await ports.findReceipt()
  active()
  if (confirmed(previous)) return
  available()
  ports.onPhase("permission")
  const permission = await ports.requestPermission()
  available()
  if (!permission.granted)
    throw new ObservationError(
      permission.canAskAgain ? "permission" : "settings",
    )
  ports.onPhase("locating")
  const startedAt = ports.now()
  let timer: ReturnType<typeof setTimeout> | undefined
  let fix: LocationFix
  try {
    fix = await Promise.race([
      ports.locate(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new ObservationError("location")),
          OBSERVATION_ACQUISITION_TIMEOUT_MS,
        )
      }),
    ])
  } catch (error) {
    if (error instanceof ObservationError) throw error
    throw new ObservationError("location")
  } finally {
    clearTimeout(timer)
  }
  available()
  validateFix(fix, startedAt, ports.now())
  // Recheck connection/auth after the OS permission dialog and GPS acquisition.
  await ports.ensureConnection()
  available()
  validateFix(fix, startedAt, ports.now())
  ports.onPhase("publishing")
  try {
    await ports.publish({
      latitude: fix.coords.latitude,
      longitude: fix.coords.longitude,
      observedAt: fix.timestamp,
    })
  } catch (failure) {
    // The preceding attempt may have committed while this new acquisition ran.
    active()
    let receipt: Receipt | null = null
    try {
      receipt = await ports.findReceipt()
    } catch {
      // Keep the original failure and request ID for the next explicit gesture.
    }
    active()
    if (!confirmed(receipt)) throw failure
  }
  active()
}

export function observationErrorMessage(error: ObservationError) {
  switch (error.code) {
    case "permission":
      return "Autorisez la localisation pour publier votre position actuelle. Vous pourrez réessayer quand vous serez près du groupe."
    case "settings":
      return "L’accès à votre position est désactivé. Autorisez-le dans les réglages du téléphone, puis revenez publier."
    case "location":
      return "Votre position actuelle n’a pas pu être obtenue. Vérifiez que la localisation du téléphone est activée, puis réessayez."
    case "stale":
      return "Le téléphone n’a pas fourni une position assez récente. Réessayez pour obtenir un nouveau relevé."
    case "live":
      return "Ce groupe est maintenant suivi en direct. La déclaration n’a pas été publiée."
    case "cancelled":
      return "La publication a été interrompue. Revenez sur le groupe pour réessayer."
  }
}
