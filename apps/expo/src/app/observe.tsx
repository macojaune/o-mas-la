import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"
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
    <SafeAreaView
      edges={
        Platform.OS === "ios"
          ? ["left", "right", "bottom"]
          : ["top", "left", "right", "bottom"]
      }
      style={[styles.page, { backgroundColor: c.surface }]}
    >
      <ScreenHeader title="Déclarer le groupe" />
      <ScrollView
        contentContainerStyle={[styles.content, s.content]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[s.group, { borderBottomColor: c.line }]}>
          <Icon name="pin" color={c.primary} size={26} />
          <View style={{ flex: 1, gap: 3 }}>
            <Label style={s.groupName}>{group?.title ?? "Le groupe"}</Label>
            <Label muted style={s.caption}>
              Observation du public
            </Label>
          </View>
        </View>
        {success ? (
          <>
            <View style={s.intro}>
              <Icon name="check" color={c.success} size={40} />
              <Label accessibilityRole="header" style={s.title}>
                Merci pour le repère.
              </Label>
              <Label muted>
                Votre observation a été enregistrée. Elle aide le public à
                retrouver ce groupe.
              </Label>
            </View>
            <Button
              title="Retrouver le groupe"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/")
              }
            />
          </>
        ) : !auth.isAuthenticated ? (
          <>
            <View style={s.intro}>
              <Label accessibilityRole="header" style={s.title}>
                Un compte pour contribuer.
              </Label>
              <Label muted>
                Connectez-vous pour déclarer le groupe près de vous. Vous
                reviendrez ici avant toute publication.
              </Label>
            </View>
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
            <Label muted style={s.caption}>
              Apple, Google ou email, selon les options disponibles.
            </Label>
            {catalog.offline && (
              <Notice tone="warning">
                Reconnectez-vous pour vous connecter et déclarer le groupe.
              </Notice>
            )}
            {error && <Notice tone="error">{error}</Notice>}
          </>
        ) : !group ? (
          <Notice>Ce groupe n’est pas disponible. Revenez à la liste.</Notice>
        ) : (
          <>
            <View style={s.intro}>
              <Label accessibilityRole="header" style={s.title}>
                Le groupe est ici, maintenant ?
              </Label>
              <Label muted>
                Publiez uniquement si vous voyez ce groupe à l’endroit où vous
                êtes.
              </Label>
            </View>
            <View style={[s.details, { borderColor: c.line }]}>
              <View style={s.detailRow}>
                <Icon name="crosshair" color={c.primary} size={23} />
                <View style={s.detailCopy}>
                  <Label style={s.detailTitle}>Votre position actuelle</Label>
                  <Label muted style={s.caption}>
                    Relevée au moment de publier
                  </Label>
                </View>
              </View>
              <View
                style={[
                  s.detailRow,
                  {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: c.line,
                  },
                ]}
              >
                <Icon name="clock" color={c.primary} size={23} />
                <View style={s.detailCopy}>
                  <Label style={s.detailTitle}>L’heure du relevé</Label>
                  <Label muted style={s.caption}>
                    Ajoutée automatiquement
                  </Label>
                </View>
              </View>
            </View>
            {!group.canObserve && (
              <Notice tone="warning">
                Un référent suit ce groupe en direct. Les déclarations sont
                indisponibles pendant ce suivi.
              </Notice>
            )}
            {catalog.offline && (
              <Notice tone="warning">
                Hors ligne. Aucune déclaration ne sera envoyée automatiquement à
                la reconnexion.
              </Notice>
            )}
            <Label muted style={s.caption}>
              Votre position et l’heure seront publiques. Votre nom n’est pas
              affiché. La localisation sera demandée à la publication.
            </Label>
            {busy && (
              <View style={s.progress} accessibilityLiveRegion="polite">
                <ActivityIndicator color={c.primary} />
                <Label muted style={[s.caption, { flex: 1 }]}>
                  {phaseLabels[phase]}
                </Label>
              </View>
            )}
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
              <Label muted style={s.caption}>
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
const s = StyleSheet.create({
  content: { maxWidth: 600, paddingTop: 12, paddingBottom: 28, gap: 22 },
  group: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  groupName: { fontSize: 21, lineHeight: 27, fontWeight: "600" },
  intro: { gap: 12, paddingTop: 2 },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  caption: { fontSize: 14, lineHeight: 20 },
  details: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    minHeight: 68,
  },
  detailCopy: { flex: 1, gap: 3 },
  detailTitle: { fontSize: 16, lineHeight: 22, fontWeight: "600" },
  progress: { flexDirection: "row", alignItems: "center", gap: 12 },
})
