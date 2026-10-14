import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useConvexAuth, useQuery } from "convex/react"

import type { Id, SessionView } from "@oyo/convex"
import { api } from "@oyo/convex"

import ScreenHeader from "~/components/screen-header"
import { saveAuthReturn } from "~/lib/auth-return"
import {
  cancelPendingActivations,
  markStopping,
  readTracking,
  stopCurrentTracking,
  stopNativeLocation,
  withTrackingTransition,
} from "~/lib/background-location"
import { useCatalog } from "~/lib/catalog"
import { useLocationHandler } from "~/lib/useLocation"
import { authenticatedClient, friendlyError } from "~/lib/write-api"
import { Button, Icon, Label, Notice, styles, usePalette } from "~/theme/ui"
import { useNativeAuth } from "~/utils/auth"

const endLabels: Record<string, string> = {
  manual: "Arrêté par le référent",
  moderation: "Arrêté par l’équipe sur le terrain",
  gps_failed: "Localisation indisponible",
  logout: "Compte déconnecté",
  duration: "Durée maximale atteinte",
  zone: "Sortie de la zone de suivi",
  speed: "Vitesse excessive confirmée",
  revoked: "Autorisation de partage retirée",
}
function Handoff({
  session,
  accountId,
  installation,
  onAccept,
  blocked,
}: {
  session: SessionView
  accountId: Id<"accounts">
  installation: string | null
  onAccept: () => void
  blocked: boolean
}) {
  const refs = useQuery(api.sessions.referents, { groupId: session.groupId })
  const events = useQuery(api.sessions.events, { sessionId: session.id })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const c = usePalette()
  const { canWrite } = useCatalog()
  async function offer(targetAccountId?: Id<"accounts">) {
    setBusy(true)
    setError(null)
    try {
      const client = await authenticatedClient()
      const args = {
        sessionId: session.id,
        deviceId: session.deviceId,
        generation: session.generation,
      }
      if (targetAccountId)
        await client.mutation(api.sessions.offerHandoff, {
          ...args,
          targetAccountId,
        })
      else await client.mutation(api.sessions.cancelHandoff, args)
    } catch (failure) {
      setError(friendlyError(failure))
    } finally {
      setBusy(false)
    }
  }
  return (
    <View style={styles.section}>
      {session.speedWarningAt && (
        <Notice tone="warning">
          Votre vitesse semble trop élevée pour le défilé. Si elle reste élevée,
          le suivi sera arrêté automatiquement.
        </Notice>
      )}
      {session.handoffToAccountId === accountId && !session.isEmitter && (
        <>
          <Notice>
            Le référent vous propose de prendre le relais pour ce groupe.
          </Notice>
          <Button
            title="Accepter le relais"
            icon="check"
            disabled={blocked || !canWrite}
            onPress={onAccept}
          />
        </>
      )}
      {session.isEmitter &&
        session.deviceId === installation &&
        session.status === "active" && (
          <>
            <Label style={{ fontSize: 17, fontWeight: "700", marginTop: 8 }}>
              Passer le relais
            </Label>
            {session.handoffToAccountId ? (
              <>
                <Label muted>
                  En attente de l’acceptation de{" "}
                  {refs?.find(
                    (ref) => ref.accountId === session.handoffToAccountId,
                  )?.displayName ?? "l’autre référent"}
                  . Vous continuez à partager jusque-là.
                </Label>
                <Button
                  title="Annuler la proposition"
                  variant="secondary"
                  busy={busy}
                  disabled={blocked || !canWrite}
                  onPress={() => void offer()}
                />
              </>
            ) : (
              <>
                {refs
                  ?.filter((ref) => ref.accountId !== accountId)
                  .map((ref) => (
                    <Pressable
                      key={ref.accountId}
                      accessibilityRole="button"
                      accessibilityLabel={`Proposer le relais à ${ref.displayName}`}
                      accessibilityState={{
                        disabled: busy || blocked || !canWrite,
                        busy,
                      }}
                      disabled={busy || blocked || !canWrite}
                      onPress={() => void offer(ref.accountId)}
                      style={({ pressed }) => [
                        s.referentRow,
                        {
                          borderBottomColor: c.line,
                          opacity:
                            busy || blocked || !canWrite
                              ? 0.5
                              : pressed
                                ? 0.65
                                : 1,
                        },
                      ]}
                    >
                      <Label style={{ color: c.primary, flex: 1 }}>
                        Proposer à {ref.displayName}
                      </Label>
                      <Icon name="chevron" color={c.muted} size={16} />
                    </Pressable>
                  ))}
                {refs?.filter((ref) => ref.accountId !== accountId).length ===
                  0 && (
                  <Label muted style={{ fontSize: 14 }}>
                    Aucun autre référent habilité pour ce groupe.
                  </Label>
                )}
              </>
            )}
          </>
        )}
      {error && <Notice tone="error">{error}</Notice>}
      {events && events.length > 0 && (
        <View style={{ gap: 8, paddingTop: 8 }}>
          <Label muted style={{ fontSize: 13, fontWeight: "700" }}>
            Derniers événements
          </Label>
          {events
            .slice(-3)
            .reverse()
            .map((event) => (
              <View key={event.id} style={{ flexDirection: "row", gap: 10 }}>
                <Icon name="clock" color={c.muted} size={16} />
                <Label muted style={{ fontSize: 13, lineHeight: 19, flex: 1 }}>
                  {new Date(event.occurredAt).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  ·{" "}
                  {event.type === "speed_warning"
                    ? "Avertissement de vitesse"
                    : event.type === "handoff"
                      ? "Relais accepté"
                      : (endLabels[event.reason ?? ""] ?? "Suivi terminé")}
                </Label>
              </View>
            ))}
        </View>
      )}
    </View>
  )
}
export default function Account() {
  const c = usePalette()
  const auth = useNativeAuth()
  const convexAuth = useConvexAuth()
  const router = useRouter()
  const catalog = useCatalog()
  const account = useQuery(
    api.accounts.me,
    convexAuth.isAuthenticated ? {} : "skip",
  )
  const tracking = useLocationHandler()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (convexAuth.isAuthenticated)
      void authenticatedClient()
        .then((client) => client.mutation(api.accounts.ensure, {}))
        .catch((failure) => setError(friendlyError(failure)))
  }, [convexAuth.isAuthenticated])
  async function login() {
    setBusy(true)
    setError(null)
    try {
      await saveAuthReturn()
      await auth.signIn()
    } catch (failure) {
      setError(friendlyError(failure))
    } finally {
      setBusy(false)
    }
  }
  async function logout() {
    cancelPendingActivations()
    let locationStopped = false
    setBusy(true)
    setError(null)
    try {
      const record = await withTrackingTransition(async () => {
        const current = await readTracking()
        if (current) await markStopping(current, "logout")
        await stopNativeLocation()
        return current
      })
      locationStopped = true
      await auth.signOut()
      await stopCurrentTracking(record)
      router.replace("/")
    } catch {
      setError(
        locationStopped
          ? "Le partage local est arrêté. La déconnexion du compte reste à confirmer : rétablissez le réseau et réessayez."
          : "L’arrêt du partage n’a pas pu être confirmé. Désactivez la localisation dans les réglages et réessayez.",
      )
    } finally {
      setBusy(false)
    }
  }
  const active =
    tracking.mine?.sessions.filter((session) => session.status === "active") ??
    []
  const ended =
    tracking.mine?.sessions
      .filter((session) => session.status === "ended")
      .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))
      .slice(0, 3) ?? []
  return (
    <SafeAreaView
      edges={
        Platform.OS === "ios"
          ? ["left", "right", "bottom"]
          : ["top", "left", "right", "bottom"]
      }
      style={[styles.page, { backgroundColor: c.surface }]}
    >
      <ScreenHeader title="Mon espace" />
      <ScrollView contentContainerStyle={[styles.content, s.content]}>
        {auth.isAuthenticated && (
          <View style={[s.profile, { borderBottomColor: c.line }]}>
            <Icon name="person" color={c.primary} size={42} />
            <View style={{ flex: 1, gap: 4 }}>
              <Label style={s.profileName}>
                {auth.user?.name ?? "Votre compte"}
              </Label>
              <Label muted style={s.caption}>
                Observations et suivi des groupes
              </Label>
            </View>
          </View>
        )}
        {auth.isLoading ? (
          <ActivityIndicator color={c.primary} />
        ) : !auth.isAuthenticated ? (
          <>
            <View style={s.intro}>
              <Icon name="person" color={c.primary} size={48} />
              <Label accessibilityRole="header" style={s.title}>
                Contribuer au suivi.
              </Label>
              <Label muted>
                Déclarez le groupe que vous voyez près de vous. Si vous êtes
                référent, retrouvez ici votre partage de position.
              </Label>
            </View>
            <Button
              title="Se connecter"
              icon="person"
              busy={busy}
              disabled={busy || !catalog.canWrite}
              onPress={() => void login()}
            />
            <Label muted style={s.caption}>
              Apple, Google ou email, selon les options disponibles à la
              connexion.
            </Label>
            {catalog.offline && (
              <Notice tone="warning">
                Reconnectez-vous pour accéder à votre compte.
              </Notice>
            )}
            <View style={[s.guestFooter, { borderTopColor: c.line }]}>
              <Label muted style={s.caption}>
                Pour retrouver les groupes, aucun compte n’est nécessaire.
              </Label>
              <Button
                title="Continuer sans compte"
                variant="secondary"
                onPress={() =>
                  router.canGoBack() ? router.back() : router.replace("/")
                }
              />
            </View>
          </>
        ) : (
          <>
            {catalog.offline && (
              <Notice tone="warning">
                Hors ligne. Les actions de session nécessitent le réseau. Vous
                pouvez toujours arrêter le partage sur ce téléphone.
              </Notice>
            )}
            <View style={styles.section}>
              <Label accessibilityRole="header" style={s.sectionTitle}>
                Mes groupes à suivre
              </Label>
              <Label muted style={s.caption}>
                Démarrez le partage uniquement lorsque vous êtes avec le groupe.
                Il continue écran verrouillé.
              </Label>
              <Label muted style={s.caption}>
                Autorisez les notifications pour recevoir les avertissements de
                vitesse écran verrouillé.
              </Label>
            </View>
            {!tracking.mine && <ActivityIndicator color={c.primary} />}
            {tracking.mine?.groups.length === 0 && (
              <Notice>
                Vous n’êtes référent d’aucun groupe pour le moment. Vous pouvez
                toujours consulter les groupes et déclarer une observation hors
                live.
              </Notice>
            )}
            {tracking.notificationsAllowed === false && (
              <Notice tone="warning">
                Les notifications de suivi ne sont pas autorisées. Les
                avertissements restent visibles dans cet espace ; activez les
                notifications dans les réglages pour les recevoir écran
                verrouillé.
              </Notice>
            )}
            {tracking.error && <Notice tone="error">{tracking.error}</Notice>}
            {tracking.error && Platform.OS !== "web" && (
              <Button
                title="Ouvrir les réglages"
                variant="secondary"
                onPress={() => void Linking.openSettings()}
              />
            )}
            {tracking.local?.pendingStop && (
              <Notice tone="warning">
                {tracking.running
                  ? "L’arrêt de la collecte reste à confirmer sur ce téléphone. Réessayez ou ouvrez les réglages."
                  : "La collecte locale est arrêtée. Confirmez l’arrêt auprès du service pour libérer le groupe."}
              </Notice>
            )}
            {tracking.mine?.groups.map((group) => {
              const session = active.find((item) => item.groupId === group.id)
              const ownDevice =
                session?.isEmitter && session.deviceId === tracking.installation
              return (
                <View
                  key={group.id}
                  style={[s.session, { borderTopColor: c.line }]}
                >
                  <View style={s.sessionHeading}>
                    <Icon
                      name="signal"
                      color={session ? c.primary : c.muted}
                      size={24}
                    />
                    <Label style={[s.sectionTitle, { flex: 1 }]}>
                      {group.title}
                    </Label>
                  </View>
                  {!session ? (
                    <Button
                      title="Démarrer le suivi"
                      icon="signal"
                      disabled={
                        busy || !catalog.canWrite || Boolean(tracking.local)
                      }
                      busy={tracking.busy}
                      onPress={() => void tracking.start(group.id)}
                    />
                  ) : (
                    <>
                      <Label style={{ color: c.primary, fontWeight: "700" }}>
                        {ownDevice
                          ? tracking.running &&
                            tracking.local?.sessionId === session.id
                            ? "Partage sur ce téléphone"
                            : "Session ouverte · partage à vérifier"
                          : "Un référent partage la position"}
                      </Label>
                      <Label muted style={{ fontSize: 14 }}>
                        Fin maximale à{" "}
                        {new Date(session.expiresAt).toLocaleTimeString(
                          "fr-FR",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                        .
                      </Label>
                      {ownDevice && (
                        <>
                          {!tracking.running &&
                            !tracking.local?.pendingStop && (
                              <Button
                                title="Reprendre sur ce téléphone"
                                disabled={busy || !catalog.canWrite}
                                busy={tracking.busy}
                                onPress={() => void tracking.resume(session)}
                              />
                            )}
                          <Button
                            title={
                              tracking.local?.pendingStop
                                ? "Confirmer l’arrêt"
                                : "Arrêter le suivi"
                            }
                            icon="stop"
                            variant="danger"
                            disabled={busy}
                            busy={tracking.busy}
                            onPress={() =>
                              void tracking.stop("manual", session)
                            }
                          />
                        </>
                      )}
                      {account && (
                        <Handoff
                          session={session}
                          blocked={busy || tracking.busy}
                          accountId={account.id}
                          installation={tracking.installation}
                          onAccept={() => void tracking.accept(session)}
                        />
                      )}
                    </>
                  )}
                </View>
              )
            })}
            {ended.length > 0 && (
              <View
                style={[
                  styles.section,
                  {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderColor: c.line,
                    paddingTop: 24,
                  },
                ]}
              >
                <Label accessibilityRole="header" style={s.sectionTitle}>
                  Derniers suivis
                </Label>
                {ended.map((session) => (
                  <View
                    key={session.id}
                    style={[s.historyRow, { borderBottomColor: c.line }]}
                  >
                    <Label style={{ fontWeight: "700" }}>
                      {catalog.data?.groups.find(
                        (group) => group.id === session.groupId,
                      )?.title ?? "Groupe"}
                    </Label>
                    <Label muted style={{ fontSize: 14 }}>
                      {endLabels[session.endReason ?? ""] ?? "Suivi terminé"}
                      {session.endedAt
                        ? ` · ${new Date(session.endedAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                        : ""}
                    </Label>
                  </View>
                ))}
              </View>
            )}
            <View style={[s.logout, { borderTopColor: c.line }]}>
              <Button
                title="Se déconnecter"
                disabled={tracking.busy}
                variant="secondary"
                busy={busy}
                onPress={() => void logout()}
              />
            </View>
          </>
        )}
        {error && <Notice tone="error">{error}</Notice>}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  content: { maxWidth: 600, paddingTop: 12, paddingBottom: 28, gap: 24 },
  intro: { gap: 18, paddingTop: 14, paddingBottom: 4 },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  caption: { fontSize: 14, lineHeight: 21 },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    paddingBottom: 24,
  },
  profileName: { fontSize: 22, lineHeight: 28, fontWeight: "600" },
  guestFooter: {
    gap: 16,
    marginTop: 4,
    paddingTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  session: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 24,
    gap: 16,
  },
  sessionHeading: { flexDirection: "row", alignItems: "center", gap: 12 },
  referentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyRow: {
    gap: 4,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logout: {
    marginTop: 8,
    paddingTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
