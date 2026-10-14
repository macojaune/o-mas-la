import { useEffect } from "react"
import { AppState, Platform } from "react-native"
import * as Notifications from "expo-notifications"
import { useRouter } from "expo-router"

import { readTracking, stopCurrentTracking } from "~/lib/background-location"

/** The OS may suspend JS timers. The native GPS callback independently enforces this same deadline before any upload. */
export default function TrackingLifecycle() {
  const router = useRouter()
  useEffect(() => {
    if (Platform.OS === "web") return
    const received = (response: Notifications.NotificationResponse) => {
      if (response.notification.request.content.data?.screen === "/account") {
        router.push("/account")
        void Notifications.clearLastNotificationResponseAsync()
      }
    }
    const listener =
      Notifications.addNotificationResponseReceivedListener(received)
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) received(response)
      })
      .catch(() => {
        /* The in-app history remains available. */
      })
    return () => listener.remove()
  }, [router])
  useEffect(() => {
    if (Platform.OS === "web") return
    let checking = false
    const check = async () => {
      if (checking) return
      checking = true
      try {
        const record = await readTracking()
        if (!record || (Date.now() < record.expiresAt && !record.pendingStop))
          return
        await stopCurrentTracking(record, !record.pendingStop)
      } catch {
        // Keep the record so that the task's own guard and the next foreground attempt can stop sharing.
      } finally {
        checking = false
      }
    }
    void check()
    const timer = setInterval(() => void check(), 5_000)
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void check()
    })
    return () => {
      clearInterval(timer)
      listener.remove()
    }
  }, [])
  return null
}
