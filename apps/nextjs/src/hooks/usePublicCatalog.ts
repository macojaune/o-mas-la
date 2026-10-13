"use client"

import { useEffect, useMemo, useState } from "react"
import { useConvexConnectionState, useQuery } from "convex/react"

import { api } from "@oyo/convex"

export function usePublicCatalog() {
  const data = useQuery(api.catalog.list, {})
  const connection = useConvexConnectionState()
  const [clock, setClock] = useState(Date.now)
  const [networkAvailable, setNetworkAvailable] = useState(true)
  const received = useMemo(() => ({ data, at: Date.now() }), [data])
  useEffect(() => {
    const update = () => {
      setClock(Date.now())
      setNetworkAvailable(navigator.onLine)
    }
    update()
    const timer = window.setInterval(update, 15_000)
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])
  return {
    data,
    now: received.data
      ? received.data.serverNow + Math.max(0, clock - received.at)
      : clock,
    online: networkAvailable && connection.isWebSocketConnected,
    hasConnected: connection.hasEverConnected,
  }
}

export type CatalogState = ReturnType<typeof usePublicCatalog>
