import type { PropsWithChildren } from "react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { AppState } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useNetInfo } from "@react-native-community/netinfo"
import { useConvex } from "convex/react"

import type { PublicCatalog } from "@oyo/convex"
import { api } from "@oyo/convex"

import type { CachedCatalog } from "./catalog-model"
import { catalogTime, parseCachedCatalog } from "./catalog-model"

const CACHE_KEY = "omasla.public-catalog.v1"
interface CatalogContextValue {
  data: PublicCatalog | null
  now: number
  savedAt: number | null
  loaded: boolean
  error: string | null
  offline: boolean
  canWrite: boolean
  refreshing: boolean
  refresh: () => void
}
const Context = createContext<CatalogContextValue | null>(null)
export function CatalogProvider({ children }: PropsWithChildren) {
  const convex = useConvex()
  const network = useNetInfo()
  const [snapshot, setSnapshot] = useState<CachedCatalog | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [cacheRead, setCacheRead] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [tick, setTick] = useState(Date.now())
  const receivedFresh = useRef(false)
  const currentSnapshot = useRef<CachedCatalog | null>(null)
  const canWrite =
    network.isConnected === true && network.isInternetReachable !== false
  const offline =
    network.isConnected === false || network.isInternetReachable === false
  const save = useCallback((data: PublicCatalog) => {
    receivedFresh.current = true
    const value: CachedCatalog = {
      version: 1,
      savedAt:
        currentSnapshot.current?.data.serverNow === data.serverNow
          ? currentSnapshot.current.savedAt
          : Date.now(),
      data,
    }
    currentSnapshot.current = value
    setSnapshot(value)
    setLoaded(true)
    setError(null)
    setRefreshing(false)
    void AsyncStorage.setItem(CACHE_KEY, JSON.stringify(value)).catch(() => {
      /* Live data remains usable when storage is unavailable. */
    })
  }, [])
  useEffect(() => {
    let active = true
    void AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (!active || receivedFresh.current) return
        const stored = parseCachedCatalog(raw)
        if (stored) {
          currentSnapshot.current = stored
          setSnapshot(stored)
          setLoaded(true)
        }
      })
      .catch(() => {
        /* A missing cache never blocks the public subscription. */
      })
      .finally(() => {
        if (active) setCacheRead(true)
      })
    const initialTimeout = setTimeout(() => {
      if (!receivedFresh.current) {
        setError("La connexion au suivi est indisponible. Réessayez.")
        setLoaded(true)
      }
    }, 12_000)
    const watch = convex.watchQuery(api.catalog.list, {})
    const update = () => {
      try {
        const result = watch.localQueryResult()
        if (result) save(result)
      } catch {
        setError(
          "Les positions ne se mettent pas à jour. Réessayez dans un instant.",
        )
        setLoaded(true)
        setRefreshing(false)
      }
    }
    const unsubscribe = watch.onUpdate(update)
    update()
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") setTick(Date.now())
    })
    const timer = setInterval(() => setTick(Date.now()), 15_000)
    return () => {
      active = false
      unsubscribe()
      appState.remove()
      clearInterval(timer)
      clearTimeout(initialTimeout)
    }
  }, [convex, save])
  const refresh = useCallback(() => {
    if (offline || refreshing) return
    setRefreshing(true)
    void convex
      .query(api.catalog.list, {})
      .then(save)
      .catch(() => {
        setError("La connexion au suivi est indisponible. Réessayez.")
        setRefreshing(false)
        setLoaded(true)
      })
  }, [convex, offline, refreshing, save])
  const value = useMemo(
    () => ({
      data: snapshot?.data ?? null,
      now: snapshot ? catalogTime(snapshot, tick) : tick,
      savedAt: snapshot?.savedAt ?? null,
      loaded: loaded || (offline && cacheRead),
      error,
      offline,
      canWrite,
      refreshing,
      refresh,
    }),
    [
      snapshot,
      tick,
      loaded,
      cacheRead,
      error,
      offline,
      canWrite,
      refreshing,
      refresh,
    ],
  )
  return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useCatalog() {
  const value = useContext(Context)
  if (!value) throw new Error("CatalogProvider missing")
  return value
}
