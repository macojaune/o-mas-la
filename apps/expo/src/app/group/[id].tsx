import { useState } from "react"
import { Linking, Platform, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useLocalSearchParams, useRouter } from "expo-router"

import { positionFreshness } from "@oyo/convex"

import ScreenHeader from "~/components/screen-header"
import { useCatalog } from "~/lib/catalog"
import {
  ageLabel,
  navigationUrl,
  positionLabel,
  visiblePosition,
} from "~/lib/catalog-model"
import { Button, Icon, Label, Notice, styles, usePalette } from "~/theme/ui"

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const catalog = useCatalog()
  const c = usePalette()
  const [error, setError] = useState<string | null>(null)
  const group = catalog.data?.groups.find((item) => item.id === id)
  const point =
    group && catalog.data
      ? visiblePosition(group, catalog.data, catalog.now)
      : null
  const fresh =
    group && catalog.data
      ? positionFreshness(group.position, catalog.data.policy, catalog.now)
      : "absent"
  async function navigate() {
    if (!point) return
    setError(null)
    try {
      const url = navigationUrl(point, Platform.OS)
      if (!(await Linking.canOpenURL(url))) throw new Error()
      await Linking.openURL(url)
    } catch {
      setError(
        "L’application de navigation n’a pas pu s’ouvrir. Réessayez depuis ce groupe.",
      )
    }
  }
  return (
    <SafeAreaView style={[styles.page, { backgroundColor: c.background }]}>
      <ScreenHeader title="Le groupe" />
      <ScrollView contentContainerStyle={styles.content}>
        {!group || !catalog.data ? (
          <>
            <Label style={styles.title}>
              {catalog.loaded
                ? "Ce groupe est introuvable"
                : "Chargement du groupe…"}
            </Label>
            <Button
              title="Retour aux groupes"
              variant="secondary"
              onPress={() => router.replace("/")}
            />
          </>
        ) : (
          <>
            <View style={{ gap: 20, paddingVertical: 14 }}>
              <View
                style={{
                  height: 72,
                  width: 72,
                  borderRadius: 20,
                  backgroundColor: c.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Label
                  style={{ fontSize: 34, fontWeight: "800", color: c.primary }}
                >
                  {group.title.slice(0, 1).toUpperCase()}
                </Label>
              </View>
              <Label
                accessibilityRole="header"
                style={[styles.title, { fontSize: 38, lineHeight: 44 }]}
              >
                {group.title}
              </Label>
            </View>
            {catalog.offline && (
              <Notice tone="warning">
                Hors ligne. Vous consultez les dernières données chargées.
              </Notice>
            )}
            <View
              style={{
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: c.line,
                paddingVertical: 24,
                gap: 15,
              }}
            >
              <View style={styles.row}>
                <Icon
                  name={fresh === "recent" ? "signal" : "clock"}
                  color={fresh === "recent" ? c.primary : c.muted}
                />
                <Label style={{ fontSize: 18, fontWeight: "700" }}>
                  {positionLabel(group, catalog.data, catalog.now)}
                </Label>
              </View>
              {group.position ? (
                <View style={{ gap: 6 }}>
                  <Label>
                    {group.position.timestampBasis === "observed"
                      ? "Observée"
                      : "Enregistrée"}{" "}
                    {ageLabel(group.position, catalog.now)}
                  </Label>
                  <Label muted>
                    {new Date(
                      group.position.observedAt ?? group.position.receivedAt,
                    ).toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Label>
                  <Label muted style={{ fontSize: 14 }}>
                    {group.position.source === "referent"
                      ? "Source : référent du groupe"
                      : group.position.source === "community"
                        ? "Source : observation du public"
                        : "Source : position historique"}
                  </Label>
                </View>
              ) : (
                <Label muted>
                  Aucune position disponible pour le moment. Le groupe reste
                  dans l’annuaire.
                </Label>
              )}
            </View>
            {point ? (
              <View style={styles.section}>
                <Button
                  title="Rejoindre ce point"
                  icon="arrow"
                  onPress={() => void navigate()}
                />
                <Label muted style={{ fontSize: 13, lineHeight: 20 }}>
                  L’itinéraire piéton mène au dernier point connu. Le groupe
                  peut continuer à se déplacer.
                  {catalog.offline
                    ? " Votre application de navigation peut nécessiter une connexion."
                    : ""}
                </Label>
              </View>
            ) : group.position ? (
              <Label muted>
                Cette position ne permet plus de proposer un itinéraire fiable.
              </Label>
            ) : null}
            {error && <Notice tone="error">{error}</Notice>}
            <View style={[styles.section, { marginTop: 10 }]}>
              <Label style={styles.heading}>Tu l’as croisé ?</Label>
              <Label muted>
                {group.live
                  ? "Le référent partage la position du groupe. Les déclarations reprendront à la fin du suivi."
                  : "Partage l’endroit où tu as vu le groupe. Ton observation sera publiée avec son heure."}
              </Label>
              <Button
                title="Déclarer une position"
                variant="secondary"
                icon="pin"
                disabled={!group.canObserve || !catalog.canWrite}
                onPress={() =>
                  router.push({
                    pathname: "/observe",
                    params: { groupId: group.id },
                  })
                }
              />
              {catalog.offline && (
                <Label muted style={{ fontSize: 13 }}>
                  Reconnectez-vous pour déclarer une position.
                </Label>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
