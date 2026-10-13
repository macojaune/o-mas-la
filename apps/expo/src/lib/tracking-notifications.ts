import { Platform } from "react-native"
import * as Notifications from "expo-notifications"
import AsyncStorage from "@react-native-async-storage/async-storage"

import type { TrackingRecord } from "./tracking-model"
import {
  createTrackingAlertDelivery,
  speedWarningAlert,
  zoneEndedAlert,
} from "./tracking-alerts"

const deliver = createTrackingAlertDelivery({
  read: (key) => AsyncStorage.getItem(key),
  write: (key, value) => AsyncStorage.setItem(key, value),
  permitted: async () =>
    Platform.OS !== "web" &&
    (await Notifications.getPermissionsAsync()).granted,
  schedule: async (alert) => {
    await Notifications.scheduleNotificationAsync({
      identifier: alert.identifier,
      content: {
        title: alert.title,
        body: alert.body,
        sound: "default",
        data: { screen: "/account" },
      },
      trigger: Platform.OS === "android" ? { channelId: "tracking" } : null,
    })
  },
})
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: () =>
      Promise.resolve({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
  })
}
export async function prepareTrackingNotifications() {
  if (Platform.OS === "web") return false
  try {
    if (Platform.OS === "android")
      await Notifications.setNotificationChannelAsync("tracking", {
        name: "Alertes de suivi",
        importance: Notifications.AndroidImportance.HIGH,
      })
    const permissions = await Notifications.requestPermissionsAsync()
    return permissions.granted
  } catch {
    return false
  }
}
export async function notifySpeedWarning(
  record: TrackingRecord,
  warningAt: number,
) {
  return deliver(speedWarningAlert(record, warningAt))
}
export function notifyZoneEnded(record: TrackingRecord) {
  return deliver(zoneEndedAlert(record))
}
