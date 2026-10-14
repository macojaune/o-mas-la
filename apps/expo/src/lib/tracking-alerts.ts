import type { TrackingRecord } from "./tracking-model"

export interface TrackingAlert {
  identifier: string
  storageKey: string
  title: string
  body: string
}
export function speedWarningAlert(
  record: TrackingRecord,
  warningAt: number,
): TrackingAlert {
  return {
    identifier: `tracking-speed-${record.sessionId}:${record.deviceId}:${record.generation}:${warningAt}`,
    storageKey: "omasla.last-speed-warning.v1",
    title: "Vitesse élevée : vérifiez le suivi",
    body: "Si cette vitesse persiste, le partage de position du groupe sera arrêté automatiquement.",
  }
}
export function zoneEndedAlert(record: TrackingRecord): TrackingAlert {
  return {
    identifier: `tracking-zone-${record.sessionId}:${record.deviceId}:${record.generation}`,
    storageKey: "omasla.last-zone-end.v1",
    title: "Suivi arrêté : sortie de zone",
    body: "La sortie de la zone autorisée a été confirmée. Votre position n’est plus partagée pour ce groupe.",
  }
}
/** Serialisation also deduplicates two callbacks arriving before the first OS delivery completes. */
export function createTrackingAlertDelivery(dependencies: {
  read: (key: string) => Promise<string | null>
  write: (key: string, value: string) => Promise<void>
  permitted: () => Promise<boolean>
  schedule: (alert: TrackingAlert) => Promise<void>
}) {
  let pending: Promise<unknown> = Promise.resolve()
  return (alert: TrackingAlert) => {
    const next = pending.then(async () => {
      if (
        (await dependencies.read(alert.storageKey)) === alert.identifier ||
        !(await dependencies.permitted())
      )
        return false
      await dependencies.schedule(alert)
      await dependencies.write(alert.storageKey, alert.identifier)
      return true
    })
    pending = next.catch(() => undefined)
    return next
  }
}

/** Both the GPS response and session reconciliation use this same terminal path. */
export function stopTrackingFromServer(
  record: TrackingRecord,
  reason: string | undefined,
  stopCurrent: (
    expected: TrackingRecord | null,
    remove?: boolean,
    afterStop?: () => Promise<unknown>,
  ) => Promise<boolean>,
  notifyZone: (record: TrackingRecord) => Promise<unknown>,
) {
  return stopCurrent(
    record,
    true,
    reason === "zone"
      ? () =>
          notifyZone(record).catch(() => {
            /* The stop remains effective if permission or OS delivery is unavailable. */
          })
      : undefined,
  )
}
