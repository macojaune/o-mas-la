import { Pressable, StyleSheet, View } from "react-native"

import type { PublicCatalog, PublicGroup } from "@oyo/convex"
import { positionFreshness } from "@oyo/convex"

import { ageLabel, positionLabel } from "~/lib/catalog-model"
import { Icon, Label, usePalette } from "~/theme/ui"

export default function GroupRow({
  group,
  catalog,
  now,
  onPress,
}: {
  group: PublicGroup
  catalog: PublicCatalog
  now: number
  onPress: () => void
}) {
  const c = usePalette()
  const freshness = positionFreshness(group.position, catalog.policy, now)
  const color =
    freshness === "recent"
      ? group.live
        ? c.primary
        : c.success
      : freshness === "aging"
        ? c.warning
        : c.muted
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${group.title}. ${positionLabel(group, catalog, now)}. Voir le groupe`}
      onPress={onPress}
      style={({ pressed }) => [
        s.row,
        {
          borderBottomColor: c.line,
          backgroundColor: pressed ? c.primarySoft : "transparent",
        },
      ]}
    >
      <View style={[s.monogram, { backgroundColor: c.primarySoft }]}>
        <Label style={{ color: c.primary, fontSize: 22, fontWeight: "800" }}>
          {group.title.slice(0, 1).toUpperCase()}
        </Label>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Label style={{ fontSize: 18, fontWeight: "700" }}>{group.title}</Label>
        <Label
          style={{ fontSize: 13, lineHeight: 19, color, fontWeight: "600" }}
        >
          {positionLabel(group, catalog, now)}
        </Label>
        {group.position && (
          <Label muted style={{ fontSize: 12, lineHeight: 18 }}>
            {ageLabel(group.position, now)}
          </Label>
        )}
      </View>
      <Icon name="arrow" color={c.muted} size={20} />
    </Pressable>
  )
}
const s = StyleSheet.create({
  row: {
    paddingVertical: 20,
    paddingHorizontal: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderBottomWidth: 1,
    minHeight: 96,
  },
  monogram: {
    height: 48,
    width: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
})
