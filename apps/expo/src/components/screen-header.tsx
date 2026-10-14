import { Pressable, StyleSheet, View } from "react-native"
import { useRouter } from "expo-router"

import { Icon, Label, usePalette } from "~/theme/ui"

export default function ScreenHeader({ title }: { title: string }) {
  const c = usePalette()
  const router = useRouter()
  return (
    <View style={[s.header, { backgroundColor: c.surface }]}>
      <View style={s.balance} />
      <Label accessibilityRole="header" style={s.title}>
        {title}
      </Label>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fermer"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/")
        }
        style={({ pressed }) => [
          s.close,
          { backgroundColor: pressed ? c.line : c.background },
        ]}
      >
        <Icon name="close" color={c.muted} size={19} />
      </Pressable>
    </View>
  )
}
const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 64,
  },
  title: {
    flex: 1,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "600",
    textAlign: "center",
  },
  balance: { width: 48 },
  close: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
})
