import { Pressable, StyleSheet, View } from "react-native"

import type { PublicCatalog, PublicGroup } from "@oyo/convex"
import { positionFreshness } from "@oyo/convex"

import { ageLabel, positionLabel } from "~/lib/catalog-model"
import { Icon, Label, usePalette } from "~/theme/ui"
import GroupEmblem from "./group-emblem"

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
  const live =
    freshness === "recent" &&
    group.live &&
    group.position?.source === "referent"
  const color = live
    ? c.success
    : freshness === "recent"
      ? c.success
      : freshness === "aging"
        ? c.warning
        : c.muted
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${group.title}. ${positionLabel(group, catalog, now)}. Voir sur la carte`}
      onPress={onPress}
      style={({ pressed }) => [
        s.row,
        {
          borderBottomColor: c.line,
          backgroundColor: pressed ? c.primarySoft : "transparent",
        },
      ]}
    >
      <View style={s.avatar}>
        <GroupEmblem group={group} size={48} />
        {live && (
          <View
            style={[
              s.dot,
              { backgroundColor: c.success, borderColor: c.surface },
            ]}
          />
        )}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Label style={{ fontSize: 17, lineHeight: 23, fontWeight: "600" }}>
          {group.title}
        </Label>
        <Label style={{ fontSize: 13, lineHeight: 19, color }}>
          {positionLabel(group, catalog, now)}
        </Label>
        {group.position && freshness !== "hidden" && (
          <Label muted style={{ fontSize: 12, lineHeight: 17 }}>
            {ageLabel(group.position, now)}
          </Label>
        )}
      </View>
      <Icon name="chevron" color={c.muted} size={14} />
    </Pressable>
  )
}
const s = StyleSheet.create({
  row: {
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 84,
  },
  avatar: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 3,
  },
})
