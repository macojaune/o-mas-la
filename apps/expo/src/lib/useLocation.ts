import { useEffect, useState } from "react"
import { AppState } from "react-native"
import { useConvexAuth, useQuery } from "convex/react"

import type { Id, SessionView } from "@oyo/convex"
import { api } from "@oyo/convex"

import type { StopReason, TrackingRecord } from "./background-location"
import {
  activationEpoch,
  assertActivationCurrent,
  cancelPendingActivations,
  clearStartRequest,
  deviceId,
  locationIsRunning,
  markStopping,
  prepareLocationPermissions,
  readTracking,
  runNativeLocation,
  startRequestId,
  stopCurrentTracking,
  stopNativeLocation,
  stopServerEndedTracking,
  withTrackingTransition,
  writeTracking,
} from "./background-location"
import { prepareTrackingNotifications } from "./tracking-notifications"
import { authenticatedClient, friendlyError } from "./write-api"

export function useLocationHandler() {
  const { isAuthenticated } = useConvexAuth()
  const mine = useQuery(api.sessions.mine, isAuthenticated ? {} : "skip")
  const [local, setLocal] = useState<TrackingRecord | null>(null)
  const [running, setRunning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notificationsAllowed, setNotificationsAllowed] = useState<
    boolean | null
  >(null)
  const [installation, setInstallation] = useState<string | null>(null)
  async function refreshLocal() {
    setLocal(await readTracking())
    setRunning(await locationIsRunning())
  }
  useEffect(() => {
    void deviceId().then(setInstallation)
    void refreshLocal().catch(() =>
      setError("L’état de localisation est indisponible."),
    )
    const change = AppState.addEventListener("change", (state) => {
      if (state === "active")
        void refreshLocal().catch(() =>
          setError("L’état de localisation est indisponible."),
        )
    })
    return () => change.remove()
  }, [])
  useEffect(() => {
    if (!mine || !local) return
    const server = mine.sessions.find(
      (session) => session.id === local.sessionId,
    )
    if (
      !server ||
      server.status === "ended" ||
      !server.isEmitter ||
      server.deviceId !== local.deviceId ||
      server.generation !== local.generation
    ) {
      let current = true
      const isCurrent = () => current
      // A subscription can still contain its pre-start snapshot. Confirm before stopping a newly started native task.
      void authenticatedClient()
        .then((client) => client.query(api.sessions.mine, {}))
        .then(async (fresh) => {
          if (!isCurrent()) return
          const confirmed = fresh.sessions.find(
            (item) => item.id === local.sessionId,
          )
          if (
            confirmed?.status === "active" &&
            confirmed.isEmitter &&
            confirmed.deviceId === local.deviceId &&
            confirmed.generation === local.generation
          )
            return
          const stored = await readTracking()
          if (
            !stored ||
            stored.sessionId !== local.sessionId ||
            stored.generation !== local.generation
          )
            return
          const confirmedOwnEnd =
            confirmed?.status === "ended" &&
            confirmed.isEmitter &&
            confirmed.deviceId === stored.deviceId &&
            confirmed.generation === stored.generation
          await stopServerEndedTracking(
            stored,
            confirmedOwnEnd ? confirmed.endReason : undefined,
          )
          if (isCurrent()) await refreshLocal()
        })
        .catch(() => {
          /* Offline reconciliation waits; the server still rejects revoked emitters. */
        })
      return () => {
        current = false
      }
    }
  }, [mine, local])
  async function work(action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : ""
      setError(
        /réglages|Toujours|arrière-plan|localisation|Une seule|téléphone/.test(
          message,
        )
          ? message
          : friendlyError(failure),
      )
    } finally {
      try {
        await refreshLocal()
      } catch {
        setError(
          "L’état du partage est indisponible. Vérifiez les réglages de localisation.",
        )
      } finally {
        setBusy(false)
      }
    }
  }
  async function activate(session: SessionView, epoch: number) {
    assertActivationCurrent(epoch)
    if (session.status !== "active")
      throw new Error("Cette session est déjà terminée.")
    setNotificationsAllowed(await prepareTrackingNotifications())
    const started: { record: TrackingRecord | null } = { record: null }
    try {
      await withTrackingTransition(async () => {
        assertActivationCurrent(epoch)
        const existing = await readTracking()
        if (
          existing &&
          (existing.sessionId !== session.id ||
            existing.generation !== session.generation ||
            existing.pendingStop)
        )
          throw new Error(
            "Arrêtez le suivi en cours sur ce téléphone avant de continuer.",
          )
        started.record = await writeTracking(session)
        await runNativeLocation()
      })
    } catch (failure) {
      if (started.record) {
        await withTrackingTransition(async () => {
          const stored = await readTracking()
          if (
            stored?.sessionId === session.id &&
            stored.generation === session.generation
          ) {
            await markStopping(stored, "gps_failed")
            await stopNativeLocation()
          }
        })
        try {
          const client = await authenticatedClient()
          await client.mutation(api.sessions.stop, {
            sessionId: session.id,
            deviceId: session.deviceId,
            generation: session.generation,
            reason: "gps_failed",
          })
          await stopCurrentTracking(started.record)
        } catch {
          /* The pending stop remains available for an explicit retry. */
        }
      }
      throw failure
    }
  }
  const start = (groupId: Id<"groups">) =>
    work(async () => {
      const epoch = activationEpoch()
      if (await readTracking())
        throw new Error(
          "Arrêtez le suivi en cours sur ce téléphone avant d’en commencer un autre.",
        )
      await prepareLocationPermissions()
      const installationId = await deviceId()
      const requestId = await startRequestId(groupId, installationId)
      const client = await authenticatedClient()
      const session = await client.mutation(api.sessions.start, {
        groupId,
        deviceId: installationId,
        requestId,
      })
      await clearStartRequest()
      await activate(session, epoch)
    })
  const stop = (reason: StopReason = "manual", session?: SessionView) =>
    work(async () => {
      cancelPendingActivations()
      const installationId = await deviceId()
      const record = await withTrackingTransition(async () => {
        const stored = await readTracking()
        // A stop action targets the selected session, never another active group on this phone.
        const selected =
          session?.isEmitter && session.deviceId === installationId
            ? {
                sessionId: session.id,
                groupId: session.groupId,
                deviceId: session.deviceId,
                generation: session.generation,
                expiresAt: session.expiresAt,
              }
            : stored
        if (!selected) {
          if (!stored) await stopNativeLocation()
          return null
        }
        if (
          !stored ||
          (stored.sessionId === selected.sessionId &&
            stored.generation === selected.generation)
        ) {
          await markStopping(selected, reason)
          await stopNativeLocation()
        }
        return selected
      })
      if (!record) return
      const client = await authenticatedClient()
      await client.mutation(api.sessions.stop, {
        sessionId: record.sessionId,
        deviceId: record.deviceId,
        generation: record.generation,
        reason,
      })
      await stopCurrentTracking(record)
    })
  const resume = (session: SessionView) =>
    work(async () => {
      const epoch = activationEpoch()
      if (!session.isEmitter || session.deviceId !== (await deviceId()))
        throw new Error("Ce suivi est associé à un autre téléphone.")
      const record = await readTracking()
      if (record?.pendingStop)
        throw new Error("Confirmez d’abord l’arrêt en attente.")
      await prepareLocationPermissions()
      const client = await authenticatedClient()
      const state = await client.query(api.sessions.mine, {})
      const current = state.sessions.find((item) => item.id === session.id)
      if (
        !current ||
        !current.isEmitter ||
        current.deviceId !== session.deviceId ||
        current.generation !== session.generation ||
        current.status !== "active"
      )
        throw new Error("Cette session n’est plus disponible.")
      await clearStartRequest()
      await activate(current, epoch)
    })
  const accept = (session: SessionView) =>
    work(async () => {
      const epoch = activationEpoch()
      const current = await readTracking()
      if (current)
        throw new Error(
          "Arrêtez votre suivi en cours avant d’accepter le relais.",
        )
      await prepareLocationPermissions()
      const client = await authenticatedClient()
      const next = await client.mutation(api.sessions.acceptHandoff, {
        sessionId: session.id,
        deviceId: await deviceId(),
        generation: session.generation,
      })
      await activate(next, epoch)
    })
  return {
    mine,
    local,
    running,
    busy,
    error,
    installation,
    notificationsAllowed,
    start,
    stop,
    resume,
    accept,
  }
}
