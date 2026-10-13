import { View } from "react-native"

import type { GroupMapProps } from "./group-map"
import { Icon, Label, usePalette } from "~/theme/ui"

/** The web export validates the shared UI, without pretending to emulate a native map. */
export default function GroupMap(_props: GroupMapProps) {
  const c = usePalette()
  return (
    <View
      style={{
        minHeight: 260,
        flex: 1,
        padding: 30,
        gap: 16,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: c.surface,
      }}
    >
      <Icon name="map" color={c.primary} size={36} />
      <Label style={{ fontSize: 22, fontWeight: "700", textAlign: "center" }}>
        La carte vous attend dans l’app
      </Label>
      <Label muted style={{ textAlign: "center", maxWidth: 330 }}>
        Sur iOS et Android, retrouvez les groupes sur la carte. Les dernières
        informations restent accessibles dans la liste.
      </Label>
    </View>
  )
}
