import type { PropsWithChildren } from "react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { AppState, Linking } from "react-native"
import NetInfo from "@react-native-community/netinfo"

import type { NativeUser } from "./auth-client"
import {
  completeNativeSignIn,
  currentUser,
  fetchConvexAccessToken,
  nativeSignIn,
  nativeSignOut,
} from "./auth-client"

interface NativeAuthState {
  isLoading: boolean
  isAuthenticated: boolean
  user: NativeUser | null
  error: string | null
  signIn: () => Promise<boolean>
  signOut: () => Promise<void>
  fetchAccessToken: (options?: {
    forceRefreshToken?: boolean
  }) => Promise<string | null>
}

const AuthContext = createContext<NativeAuthState | null>(null)

export function NativeAuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<NativeUser | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchAccessToken = useCallback(
    async (options?: { forceRefreshToken?: boolean }) => {
      const token = await fetchConvexAccessToken(options)
      setUser(token ? currentUser() : null)
      return token
    },
    [],
  )
  useEffect(() => {
    let mounted = true
    const complete = async (url: string | null) => {
      if (!url?.startsWith("omasla://login")) return
      if (mounted) {
        setLoading(true)
        setError(null)
      }
      try {
        if (await completeNativeSignIn(url)) {
          if (mounted) setUser(currentUser())
        }
      } catch (reason) {
        if (mounted)
          setError(
            reason instanceof Error
              ? reason.message
              : "La connexion n’a pas abouti.",
          )
      } finally {
        if (mounted) setLoading(false)
      }
    }
    const restore = () => {
      void fetchConvexAccessToken()
        .then((token) => {
          if (mounted) setUser(token ? currentUser() : null)
        })
        .catch(() => {
          // Public consultation remains available if restoring the session needs network.
        })
        .finally(() => {
          if (mounted) setLoading(false)
        })
    }
    restore()
    void Linking.getInitialURL()
      .then(complete)
      .catch(() => undefined)
    const link = Linking.addEventListener("url", ({ url }) => {
      void complete(url)
    })
    const unsubscribeNetwork = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) restore()
    })
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") restore()
    })
    return () => {
      mounted = false
      unsubscribeNetwork()
      foreground.remove()
      link.remove()
    }
  }, [])
  const signIn = useCallback(async () => {
    setError(null)
    const success = await nativeSignIn()
    if (success) setUser(currentUser())
    return success
  }, [])
  const signOut = useCallback(async () => {
    await nativeSignOut()
    setUser(null)
  }, [])
  const value = useMemo(
    () => ({
      isLoading,
      isAuthenticated: !!user,
      user,
      error,
      signIn,
      signOut,
      fetchAccessToken,
    }),
    [isLoading, user, error, signIn, signOut, fetchAccessToken],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useNativeAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("NativeAuthProvider is required")
  return context
}

export const useUser = () => useNativeAuth().user
export const useSignIn = () => useNativeAuth().signIn
export const useSignOut = () => useNativeAuth().signOut
export { nativeSignIn as signIn }
