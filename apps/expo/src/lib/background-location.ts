import { Platform } from "react-native"
import * as Crypto from "expo-crypto"
import * as Location from "expo-location"
import * as TaskManager from "expo-task-manager"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { ConvexHttpClient } from "convex/browser"

import type { SessionView } from "@oyo/convex"
import { api } from "@oyo/convex"

import type { StopReason, TrackingRecord } from "./tracking-model"
import { fetchConvexAccessToken } from "~/utils/auth-client"
import { stopTrackingFromServer } from "./tracking-alerts"
import {
  canTransmit,
  createTrackingTransitions,
  parseTracking,
} from "./tracking-model"
import { notifySpeedWarning, notifyZoneEnded } from "./tracking-notifications"

export type { StopReason, TrackingRecord } from "./tracking-model"

export const LOCATION_TASK = "omasla-background-location-v2"
const RECORD_KEY = "omasla.tracking.v2"
const DEVICE_KEY = "omasla.installation.v2"
const START_KEY = "omasla.start-request.v2"
// Network awaits stay outside this lock.
const transitions = createTrackingTransitions(
  readTracking,
  stopNativeLocation,
  clearTracking,
)
export const withTrackingTransition = transitions.run
export const stopCurrentTracking = transitions.stopIfCurrent
export function stopServerEndedTracking(
  record: TrackingRecord,
  reason: string | undefined,
) {
  return stopTrackingFromServer(
    record,
    reason,
    stopCurrentTracking,
    notifyZoneEnded,
  )
}
let activationVersion = 0
export function activationEpoch() {
  return activationVersion
}
export function cancelPendingActivations() {
  activationVersion++
}
export function assertActivationCurrent(expected: number) {
  if (expected !== activationVersion)
    throw new Error(
      "Ce démarrage a été annulé. Relancez le suivi depuis votre espace.",
    )
}
export async function deviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_KEY)
  if (existing) return existing
  const value = Crypto.randomUUID()
  await AsyncStorage.setItem(DEVICE_KEY, value)
  return value
}
export async function readTracking(): Promise<TrackingRecord | null> {
  try {
    return parseTracking(await AsyncStorage.getItem(RECORD_KEY))
  } catch {
    return null
  }
}
export async function writeTracking(session: SessionView) {
  const record: TrackingRecord = {
    sessionId: session.id,
    groupId: session.groupId,
    deviceId: session.deviceId,
    generation: session.generation,
    expiresAt: session.expiresAt,
  }
  await AsyncStorage.setItem(RECORD_KEY, JSON.stringify(record))
  return record
}
export async function markStopping(record: TrackingRecord, reason: StopReason) {
  await AsyncStorage.setItem(
    RECORD_KEY,
    JSON.stringify({ ...record, pendingStop: reason }),
  )
}
export async function clearTracking() {
  await AsyncStorage.removeItem(RECORD_KEY)
}
export async function startRequestId(groupId: string, installation: string) {
  const raw = await AsyncStorage.getItem(START_KEY)
  if (raw) {
    try {
      const value = JSON.parse(raw) as {
        groupId: string
        deviceId: string
        requestId: string
      }
      if (value.groupId === groupId && value.deviceId === installation)
        return value.requestId
    } catch {
      /* Replace invalid local metadata. */
    }
  }
  const requestId = Crypto.randomUUID()
  await AsyncStorage.setItem(
    START_KEY,
    JSON.stringify({ groupId, deviceId: installation, requestId }),
  )
  return requestId
}
export async function clearStartRequest() {
  await AsyncStorage.removeItem(START_KEY)
}
export async function stopNativeLocation() {
  if (
    Platform.OS !== "web" &&
    (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK))
  )
    await Location.stopLocationUpdatesAsync(LOCATION_TASK)
}
export async function locationIsRunning() {
  return (
    Platform.OS !== "web" &&
    (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK))
  )
}
export async function prepareLocationPermissions() {
  if (Platform.OS === "web")
    throw new Error(
      "Le partage en arrière-plan est disponible dans l’app iOS ou Android.",
    )
  if (!(await Location.hasServicesEnabledAsync()))
    throw new Error(
      "Activez la localisation de votre téléphone dans les réglages.",
    )
  const foreground = await Location.requestForegroundPermissionsAsync()
  if (!foreground.granted)
    throw new Error(
      "Autorisez votre position dans les réglages pour partager le suivi du groupe.",
    )
  const background = await Location.requestBackgroundPermissionsAsync()
  if (!background.granted)
    throw new Error(
      "Pour partager écran verrouillé, autorisez la localisation Toujours dans les réglages. Le choix Une seule fois ne suffit pas.",
    )
}
export async function runNativeLocation() {
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 15_000,
    distanceInterval: 10,
    deferredUpdatesInterval: 15_000,
    activityType: Location.ActivityType.Fitness,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "O Mas La ? · suivi du groupe",
      notificationBody:
        "Votre position est partagée. Ouvrez l’app pour arrêter le suivi.",
      killServiceOnDestroy: true,
    },
  })
}
if (Platform.OS !== "web")
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
    LOCATION_TASK,
    async ({ data, error }) => {
      const record = await readTracking()
      if (error) {
        await withTrackingTransition(async () => {
          const current = await readTracking()
          if (
            record &&
            current?.sessionId === record.sessionId &&
            current.generation === record.generation
          ) {
            await markStopping(current, "gps_failed")
            await stopNativeLocation()
          }
        })
        return
      }
      if (!record || !canTransmit(record, Date.now())) {
        await stopCurrentTracking(record, !record?.pendingStop)
        return
      }
      try {
        const token = await fetchConvexAccessToken()
        if (!token) {
          await stopCurrentTracking(record, false)
          return
        }
        const url = process.env.EXPO_PUBLIC_CONVEX_URL
        if (!url) return
        const client = new ConvexHttpClient(url)
        client.setAuth(token)
        // A failed batch is dropped, not re-stamped or replayed as a fresh observation.
        for (const location of data.locations.sort(
          (a, b) => a.timestamp - b.timestamp,
        )) {
          const current = await readTracking()
          if (!canTransmit(current, Date.now(), record)) break
          const result = await client.mutation(api.telemetry.ingest, {
            sessionId: record.sessionId,
            deviceId: record.deviceId,
            generation: record.generation,
            sampleId: `${record.generation}:${location.timestamp}`,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            observedAt: location.timestamp,
            ...(location.coords.accuracy !== null &&
            location.coords.accuracy >= 0
              ? { accuracyMeters: location.coords.accuracy }
              : {}),
            ...(location.coords.speed !== null && location.coords.speed >= 0
              ? { speedMps: location.coords.speed }
              : {}),
          })
          if (
            "speedWarningAt" in result &&
            typeof result.speedWarningAt === "number" &&
            canTransmit(await readTracking(), Date.now(), record)
          ) {
            await notifySpeedWarning(record, result.speedWarningAt).catch(
              () => {
                /* The in-app warning remains available if the OS refuses notification delivery. */
              },
            )
          }
          if (result.sessionEnded) {
            await stopServerEndedTracking(record, result.reason)
            break
          }
        }
      } catch (failure) {
        const message = failure instanceof Error ? failure.message : ""
        if (
          /EMITTER|FORBIDDEN|REVOKED|AUTH_REQUIRED|AUTH_INVALID|AUTH_EXPIRED|ACCOUNT_REQUIRED|SESSION_NOT_FOUND|UNAUTHENTICATED|SESSION_ENDED|REFERENT_REQUIRED/.test(
            message,
          )
        ) {
          await stopCurrentTracking(record)
        }
      }
    },
  )
