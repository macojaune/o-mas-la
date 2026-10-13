import { useRef, useState } from "react"
import { Platform, ScrollView, TextInput, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import * as Crypto from "expo-crypto"
import * as Location from "expo-location"
import { useLocalSearchParams, useRouter } from "expo-router"

import { api } from "@oyo/convex"

import GroupMap from "~/components/group-map"
import ScreenHeader from "~/components/screen-header"
import { saveAuthReturn } from "~/lib/auth-return"
import { useCatalog } from "~/lib/catalog"
import { observationTime } from "~/lib/observation-time"
import { authenticatedClient, friendlyError } from "~/lib/write-api"
import { Button, Label, Notice, styles, usePalette } from "~/theme/ui"
import { useNativeAuth } from "~/utils/auth"

export default function Observe() {
  const c = usePalette()
  const { groupId } = useLocalSearchParams<{ groupId: string }>()
  const router = useRouter()
  const auth = useNativeAuth()
  const catalog = useCatalog()
  const group = catalog.data?.groups.find((item) => item.id === groupId)
  const [point, setPoint] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const [when, setWhen] = useState(() =>
    new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const request = useRef<{ key: string; id: string } | null>(null)
  async function locate() {
    setBusy(true)
    setError(null)
    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (!permission.granted) {
        setError("Sans autorisation, placez le point sur la carte.")
        return
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })
      setPoint({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      })
    } catch {
      setError(
        "Votre position n’a pas pu être obtenue. Placez le point sur la carte.",
      )
    } finally {
      setBusy(false)
    }
  }
  async function submit() {
    if (!group || !point || !catalog.canWrite || !group.canObserve || busy)
      return
    const observedAt = observationTime(when, catalog.now)
    if (observedAt === null) {
      setError(
        "Indiquez l’heure d’une observation déjà faite aujourd’hui, par exemple 18:30.",
      )
      return
    }
    setBusy(true)
    setError(null)
    try {
      const client = await authenticatedClient()
      const key = `${group.id}:${point.latitude}:${point.longitude}:${observedAt}`
      if (request.current?.key !== key)
        request.current = { key, id: Crypto.randomUUID() }
      await client.mutation(api.observations.create, {
        groupId: group.id,
        latitude: point.latitude,
        longitude: point.longitude,
        observedAt,
        requestId: request.current.id,
      })
      setSuccess(true)
    } catch (failure) {
      setError(friendlyError(failure))
    } finally {
      setBusy(false)
    }
  }
  return (
    <SafeAreaView style={[styles.page, { backgroundColor: c.background }]}>
      <ScreenHeader title="Déclarer une position" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <Label style={styles.title}>{group?.title ?? "Le groupe"}</Label>
        {success ? (
          <>
            <Notice>
              Votre observation est publiée. Merci d’aider à retrouver le
              groupe.
            </Notice>
            <Button title="Voir le groupe" onPress={() => router.back()} />
          </>
        ) : !auth.isAuthenticated ? (
          <>
            <Label muted>
              Connectez-vous pour partager une observation. La consultation
              reste libre.
            </Label>
            <Button
              title="Se connecter"
              busy={busy || auth.isLoading}
              disabled={!catalog.canWrite}
              onPress={() => {
                setBusy(true)
                setError(null)
                void saveAuthReturn(groupId)
                  .then(() => auth.signIn())
                  .catch((failure) => setError(friendlyError(failure)))
                  .finally(() => setBusy(false))
              }}
            />
            {error && <Notice tone="error">{error}</Notice>}
          </>
        ) : !group ? (
          <Notice>Ce groupe n’est pas disponible. Revenez à la liste.</Notice>
        ) : (
          <>
            <Label muted>
              Placez le point où vous avez vu le groupe, puis vérifiez l’heure
              de votre observation.
            </Label>
            {!group.canObserve && (
              <Notice tone="warning">
                Un suivi est en cours pour ce groupe. La déclaration est
                indisponible.
              </Notice>
            )}
            {catalog.offline && (
              <Notice tone="warning">
                Hors ligne. Votre déclaration ne sera pas envoyée
                automatiquement à la reconnexion.
              </Notice>
            )}
            <View
              style={{
                height: 280,
                borderRadius: 16,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: c.line,
              }}
            >
              {catalog.data && (
                <GroupMap
                  catalog={catalog.data}
                  now={catalog.now}
                  onSelect={() => {
                    /* Selection is handled by onPick in this form. */
                  }}
                  picking
                  picked={point}
                  onPick={setPoint}
                />
              )}
            </View>
            <Button
              title="Utiliser ma position"
              variant="secondary"
              icon="crosshair"
              busy={busy}
              disabled={!catalog.canWrite}
              onPress={() => void locate()}
            />
            <Label muted style={{ fontSize: 13 }}>
              {point
                ? "Point sélectionné. Vérifiez qu’il correspond bien au groupe."
                : Platform.OS === "web"
                  ? "Utilisez votre position pour cet aperçu. Le placement sur la carte est disponible dans l’app."
                  : "Touchez la carte pour choisir l’endroit exact."}
            </Label>
            <View style={styles.section}>
              <Label style={{ fontWeight: "700" }}>
                Heure de l’observation, aujourd’hui
              </Label>
              <TextInput
                accessibilityLabel="Heure de l’observation au format heures minutes"
                value={when}
                onChangeText={setWhen}
                placeholder="18:30"
                maxLength={5}
                keyboardType={
                  Platform.OS === "ios" ? "numbers-and-punctuation" : "default"
                }
                style={[
                  styles.input,
                  {
                    backgroundColor: c.surface,
                    borderColor: c.line,
                    color: c.ink,
                  },
                ]}
              />
              <Label muted style={{ fontSize: 13 }}>
                La position et cette heure seront publiques. Votre nom n’est pas
                affiché.
              </Label>
            </View>
            {error && <Notice tone="error">{error}</Notice>}
            <Button
              title="Publier l’observation"
              busy={busy}
              disabled={!point || !catalog.canWrite || !group.canObserve}
              onPress={() => void submit()}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
