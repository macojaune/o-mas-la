import { useEffect } from "react"
import { ActivityIndicator, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

import { consumeAuthReturn } from "~/lib/auth-return"
import { Button, Label, styles, usePalette } from "~/theme/ui"
import { useNativeAuth } from "~/utils/auth"

// NativeAuthProvider consumes both WebBrowser callbacks and cold/warm deep links.
// Restore only the allowlisted in-app destination, without publishing a draft.
export default function LoginReturn() {
  const auth = useNativeAuth()
  const router = useRouter()
  const c = usePalette()
  useEffect(() => {
    if (!auth.isAuthenticated || auth.isLoading) return
    void consumeAuthReturn()
      .then((destination) => router.replace(destination))
      .catch(() => router.replace("/account"))
  }, [auth.isAuthenticated, auth.isLoading, router])
  return (
    <SafeAreaView style={[styles.page, { backgroundColor: c.background }]}>
      <View style={styles.content}>
        <Label style={styles.title}>Retour à l’app</Label>
        {!auth.error && <ActivityIndicator color={c.primary} />}
        <Label muted>
          {auth.error ??
            "La connexion se termine. Si la fenêtre de connexion a été fermée, vous pouvez reprendre depuis votre espace."}
        </Label>
        <Button
          title="Revenir à mon espace"
          variant="secondary"
          onPress={() => router.replace("/account")}
        />
      </View>
    </SafeAreaView>
  )
}
