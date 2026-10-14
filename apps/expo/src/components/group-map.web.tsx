import { StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import type { GroupMapProps } from "./group-map"
import { Icon, Label, usePalette } from "~/theme/ui"

/** Native maps stay a native surface; the preview keeps its surrounding controls. */
export default function GroupMap({
  bottomInset = 0,
  leftInset = 0,
}: GroupMapProps) {
  const c = usePalette()
  const safeArea = useSafeAreaInsets()
  return (
    <View style={[s.wrap, { backgroundColor: c.background }]}>
      <View
        style={[
          s.notice,
          {
            backgroundColor: c.surface,
            left: Math.max(20, leftInset + 20),
            right: 20,
            bottom: Math.max(safeArea.bottom + 28, bottomInset + 20),
          },
        ]}
      >
        <Icon name="map" color={c.muted} size={24} />
        <View style={s.copy}>
          <Label style={s.title}>La carte se consulte dans l’app</Label>
          <Label muted style={s.description}>
            Les groupes et leurs dernières informations restent accessibles dans
            la liste.
          </Label>
        </View>
      </View>
    </View>
  )
}
const s = StyleSheet.create({
  wrap: { flex: 1 },
  notice: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 14,
    borderRadius: 16,
  },
  copy: { flex: 1, gap: 4 },
  title: { fontSize: 15, lineHeight: 20, fontWeight: "600" },
  description: { fontSize: 13, lineHeight: 18 },
})
