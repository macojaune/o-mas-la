import { Pressable, View } from "react-native"
import { useRouter } from "expo-router"

import { Icon, Label, usePalette } from "~/theme/ui"

export default function ScreenHeader({ title }: { title: string }) {
  const c = usePalette()
  const router = useRouter()
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: c.line,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retour"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/")
        }
        style={{
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="back" color={c.ink} />
      </Pressable>
      <Label style={{ fontSize: 17, fontWeight: "700", flex: 1 }}>
        {title}
      </Label>
    </View>
  )
}
