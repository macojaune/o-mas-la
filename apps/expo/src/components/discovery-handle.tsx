import { Pressable, useWindowDimensions, View } from "react-native"
import { useBottomSheet } from "@gorhom/bottom-sheet"

import { usePalette } from "~/theme/ui"

/** Native drag affordance with the same operation available to VoiceOver/TalkBack. */
export default function DiscoveryHandle({ index }: { index: number }) {
  const c = usePalette()
  const { width } = useWindowDimensions()
  const { animatedIndex, snapToIndex } = useBottomSheet()
  if (width >= 700) return <View style={{ height: 20 }} />
  const move = (delta: number) =>
    snapToIndex(
      Math.max(0, Math.min(2, Math.round(animatedIndex.get()) + delta)),
    )
  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel="Panneau des groupes"
      accessibilityValue={{
        min: 0,
        max: 2,
        now: index,
        text: ["Réduit", "Intermédiaire", "Agrandi"][index],
      }}
      accessibilityHint="Balaye vers le haut pour agrandir, vers le bas pour réduire."
      accessibilityActions={[
        { name: "increment", label: "Agrandir le panneau" },
        { name: "decrement", label: "Réduire le panneau" },
      ]}
      onAccessibilityAction={(event) =>
        move(event.nativeEvent.actionName === "increment" ? 1 : -1)
      }
      onPress={() => move(animatedIndex.get() >= 2 ? -1 : 1)}
      hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}
      style={{ height: 28, alignItems: "center", justifyContent: "center" }}
    >
      <View
        style={{
          width: 36,
          height: 5,
          borderRadius: 3,
          backgroundColor: c.line,
        }}
      />
    </Pressable>
  )
}
