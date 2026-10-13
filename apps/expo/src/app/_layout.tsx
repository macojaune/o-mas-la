import "~/lib/background-location"

import type { ErrorInfo, PropsWithChildren } from "react"
import { Component } from "react"
import { View } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react"

import TrackingLifecycle from "~/components/tracking-lifecycle"
import { CatalogProvider } from "~/lib/catalog"
import { Button, Label, styles, usePalette } from "~/theme/ui"
import { NativeAuthProvider, useNativeAuth } from "~/utils/auth"

const url = process.env.EXPO_PUBLIC_CONVEX_URL
const convex = url
  ? new ConvexReactClient(url, { unsavedChangesWarning: false })
  : null
class AppBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    /* Do not log tokens or raw server error payloads. */
  }
  render() {
    return this.state.failed ? (
      <Recovery onRetry={() => this.setState({ failed: false })} />
    ) : (
      this.props.children
    )
  }
}
function Recovery({ onRetry }: { onRetry?: () => void }) {
  const c = usePalette()
  return (
    <View
      style={[
        styles.page,
        { backgroundColor: c.background, justifyContent: "center" },
      ]}
    >
      <View style={styles.content}>
        <Label style={styles.title}>On revient vite.</Label>
        <Label muted>
          Le service de suivi est momentanément indisponible. Réessayez dans un
          instant.
        </Label>
        {onRetry && <Button title="Réessayer" onPress={onRetry} />}
      </View>
    </View>
  )
}
function Routes() {
  const c = usePalette()
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.background },
          animation: "slide_from_right",
        }}
      />
      <TrackingLifecycle />
      <StatusBar style={c.background === "#16141b" ? "light" : "dark"} />
    </>
  )
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppBoundary>
        {convex ? (
          <NativeAuthProvider>
            <ConvexProviderWithAuth client={convex} useAuth={useNativeAuth}>
              <CatalogProvider>
                <Routes />
              </CatalogProvider>
            </ConvexProviderWithAuth>
          </NativeAuthProvider>
        ) : (
          <Recovery />
        )}
      </AppBoundary>
    </SafeAreaProvider>
  )
}
