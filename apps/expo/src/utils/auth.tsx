import type { PropsWithChildren } from "react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { AppState } from "react-native"
import NetInfo from "@react-native-community/netinfo"

import type { NativeUser } from "./auth-client"
import {
  currentUser,
  fetchConvexAccessToken,
  nativeSignIn,
  nativeSignOut,
} from "./auth-client"

interface NativeAuthState {
  isLoading: boolean
  isAuthenticated: boolean
  user: NativeUser | null
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
    }
  }, [])
  const signIn = useCallback(async () => {
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
      signIn,
      signOut,
      fetchAccessToken,
    }),
    [isLoading, user, signIn, signOut, fetchAccessToken],
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
