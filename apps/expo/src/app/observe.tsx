import { useEffect, useRef, useState } from "react"
import { Linking, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import * as Crypto from "expo-crypto"
import * as Location from "expo-location"
import { useLocalSearchParams, useRouter } from "expo-router"

import { api } from "@oyo/convex"

import ScreenHeader from "~/components/screen-header"
import { saveAuthReturn } from "~/lib/auth-return"
import { useCatalog } from "~/lib/catalog"
import {
  ObservationError,
  observationErrorMessage,
  publishCurrentObservation,
} from "~/lib/current-observation"
import { authenticatedClient, friendlyError } from "~/lib/write-api"
import { Button, Icon, Label, Notice, styles, usePalette } from "~/theme/ui"
import { useNativeAuth } from "~/utils/auth"

const phaseLabels = {
  checking: "Vérification de la connexion…",
  permission: "Autorisation de localisation…",
  locating: "Recherche de votre position actuelle…",
  publishing: "Publication en cours…",
}

export default function Observe() {
  const c = usePalette()
  const { groupId } = useLocalSearchParams<{ groupId: string }>()
  const router = useRouter()
  const auth = useNativeAuth()
  const catalog = useCatalog()
  const group = catalog.data?.groups.find((item) => item.id === groupId)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<keyof typeof phaseLabels>("checking")
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [success, setSuccess] = useState(false)
  const request = useRef<{ groupId: string; id: string } | null>(null)
  const inFlight = useRef(false)
  const mounted = useRef(true)
  const latest = useRef({ auth, catalog, groupId, group })
  latest.current = { auth, catalog, groupId, group }
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  async function submit() {
    if (!group || !catalog.canWrite || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError(null)
    setShowSettings(false)
    setAttempted(true)
    const userId = auth.user?.id
    if (request.current?.groupId !== group.id)
      request.current = { groupId: group.id, id: Crypto.randomUUID() }
    const requestId = request.current.id
    let client: Awaited<ReturnType<typeof authenticatedClient>> | null = null
    const isActive = () =>
      mounted.current &&
      latest.current.groupId === group.id &&
      latest.current.auth.isAuthenticated &&
      latest.current.auth.user?.id === userId
    try {
      await publishCurrentObservation({
        groupId: group.id,
        now: Date.now,
        isActive,
        canObserve: () => latest.current.group?.canObserve === true,
        ensureConnection: async () => {
          if (!latest.current.catalog.canWrite)
            throw new Error("Vous êtes hors ligne.")
          client = await authenticatedClient()
        },
        findReceipt: () => {
          if (!client) throw new Error("Connectez-vous pour continuer.")
          return client.query(api.observations.byRequest, { requestId })
        },
        requestPermission: Location.requestForegroundPermissionsAsync,
        locate: () =>
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          }),
        publish: async (observation) => {
          if (!client) throw new Error("Connectez-vous pour continuer.")
          await client.mutation(api.observations.create, {
            groupId: group.id,
            requestId,
            ...observation,
          })
        },
        onPhase: setPhase,
      })
      if (isActive()) setSuccess(true)
    } catch (failure) {
      if (isActive()) {
        setError(
          failure instanceof ObservationError
            ? observationErrorMessage(failure)
            : friendlyError(failure),
        )
        setShowSettings(
          failure instanceof ObservationError && failure.code === "settings",
        )
      }
    } finally {
      inFlight.current = false
      if (mounted.current) setBusy(false)
    }
  }
  return (
    <SafeAreaView style={[styles.page, { backgroundColor: c.background }]}>
      <ScreenHeader title="Déclarer une position" />
      <ScrollView contentContainerStyle={styles.content}>
        <Label style={styles.title}>{group?.title ?? "Le groupe"}</Label>
        {success ? (
          <>
            <Notice>
              Votre observation a été enregistrée. Merci d’aider à retrouver le
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
            <View
              style={[
                styles.section,
                { backgroundColor: c.surface, padding: 24, borderRadius: 16 },
              ]}
            >
              <Icon name="crosshair" color={c.primary} size={32} />
              <Label style={{ fontSize: 21, fontWeight: "700" }}>
                Le groupe est près de vous, maintenant ?
              </Label>
              <Label muted>
                Publiez uniquement si vous voyez ce groupe à l’endroit où vous
                êtes. Le téléphone relèvera votre position actuelle et l’heure
                du relevé au moment de publier.
              </Label>
            </View>
            {!group.canObserve && (
              <Notice tone="warning">
                Un suivi est en cours pour ce groupe. La déclaration est
                indisponible.
              </Notice>
            )}
            {catalog.offline && (
              <Notice tone="warning">
                Hors ligne. Aucune déclaration ne sera envoyée automatiquement à
                la reconnexion.
              </Notice>
            )}
            <Label muted style={{ fontSize: 13 }}>
              Votre position et l’heure du relevé seront publiques. Votre nom
              n’est pas affiché. L’autorisation de localisation est nécessaire
              pour cette publication.
            </Label>
            {busy && <Notice>{phaseLabels[phase]}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}
            {showSettings && (
              <Button
                title="Ouvrir les réglages"
                variant="secondary"
                onPress={() => {
                  void Linking.openSettings().catch(() =>
                    setError(
                      "Ouvrez les réglages du téléphone pour autoriser la localisation de l’app.",
                    ),
                  )
                }}
              />
            )}
            {attempted && error && (
              <Label muted style={{ fontSize: 13 }}>
                Réessayer vérifie d’abord si votre observation a été
                enregistrée. Sinon, une nouvelle position sera relevée.
              </Label>
            )}
            <Button
              title={
                attempted && error
                  ? "Réessayer"
                  : "Publier ma position actuelle"
              }
              icon="crosshair"
              busy={busy}
              disabled={!catalog.canWrite || (!group.canObserve && !attempted)}
              onPress={() => void submit()}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
