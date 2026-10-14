import { useState } from "react"
import { Linking, Platform, View } from "react-native"

import type { PublicCatalog, PublicGroup } from "@oyo/convex"
import { positionFreshness } from "@oyo/convex"

import {
  ageLabel,
  navigationUrl,
  positionLabel,
  visiblePosition,
} from "~/lib/catalog-model"
import { Button, Icon, Label, Notice, usePalette } from "~/theme/ui"

export default function GroupDetailPanel({
  group,
  catalog,
  now,
  offline,
  canWrite,
  onObserve,
}: {
  group: PublicGroup
  catalog: PublicCatalog
  now: number
  offline: boolean
  canWrite: boolean
  onObserve: () => void
}) {
  const c = usePalette()
  const [error, setError] = useState<string | null>(null)
  const point = visiblePosition(group, catalog, now)
  const freshness = positionFreshness(group.position, catalog.policy, now)
  const live =
    freshness === "recent" &&
    group.live &&
    group.position?.source === "referent"
  const tint = live
    ? c.success
    : freshness === "aging"
      ? c.warning
      : freshness === "recent"
        ? c.success
        : c.muted
  const source =
    group.position?.source === "referent"
      ? "Référent GPS"
      : group.position?.source === "community"
        ? "Observation du public"
        : "Dernier point connu"
  async function navigate() {
    if (!point) return
    setError(null)
    try {
      const url = navigationUrl(point, Platform.OS)
      if (!(await Linking.canOpenURL(url))) throw new Error()
      await Linking.openURL(url)
    } catch {
      setError(
        "Impossible d’ouvrir l’application de navigation. Réessaie depuis cette fiche.",
      )
    }
  }
  return (
    <View style={{ gap: 20, paddingTop: 2 }}>
      <View style={{ gap: 10 }}>
        <Label style={{ fontSize: 14, lineHeight: 21, color: c.muted }}>
          <Label style={{ color: tint, fontWeight: "600" }}>
            {positionLabel(group, catalog, now)}
          </Label>
          {group.position
            ? ` · ${source} · ${ageLabel(group.position, now)}`
            : ""}
        </Label>
        {!group.position && (
          <Label muted style={{ fontSize: 15, lineHeight: 22 }}>
            Aucune position partagée pour le moment. Le groupe reste dans
            l’annuaire.
          </Label>
        )}
      </View>
      {point ? (
        <View style={{ gap: 10 }}>
          <Button title="Rejoindre ce point" onPress={() => void navigate()} />
          <Label
            muted
            style={{ fontSize: 12, lineHeight: 18, textAlign: "center" }}
          >
            Vers la dernière position connue. Le groupe peut continuer à
            avancer.{offline ? " La navigation peut nécessiter du réseau." : ""}
          </Label>
        </View>
      ) : group.position ? (
        <Notice tone="warning">
          Ce point est trop ancien pour proposer un itinéraire. Une nouvelle
          position est attendue.
        </Notice>
      ) : null}
      {error && <Notice tone="error">{error}</Notice>}
      <View
        style={{
          borderTopWidth: 0.5,
          borderTopColor: c.line,
          paddingTop: 18,
          gap: 12,
        }}
      >
        {group.live ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Icon name="info" color={c.muted} size={18} />
            <Label muted style={{ fontSize: 13, lineHeight: 20, flex: 1 }}>
              Le suivi du référent est actif. Les déclarations reprendront à la
              fin du live.
            </Label>
          </View>
        ) : (
          <>
            <Label style={{ fontSize: 17, fontWeight: "600" }}>
              Le groupe est ici, avec toi ?
            </Label>
            <Button
              title="Partager sa position ici"
              icon="pin"
              variant="secondary"
              disabled={!group.canObserve || !canWrite}
              onPress={onObserve}
            />
            <Label muted style={{ fontSize: 12, lineHeight: 18 }}>
              {offline
                ? "Reconnecte-toi pour partager une position."
                : "Ta position actuelle et l’heure du relevé seront publiées."}
            </Label>
          </>
        )}
      </View>
    </View>
  )
}
