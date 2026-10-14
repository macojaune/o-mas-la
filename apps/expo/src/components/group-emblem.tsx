import { StyleSheet, Text, useWindowDimensions, View } from "react-native"
import Svg, { Circle, Ellipse, G, Line, Path } from "react-native-svg"

import type { PublicGroup } from "@oyo/convex"

import { groupIdentity } from "~/lib/group-identity"

export default function GroupEmblem({
  group,
  size = 48,
  bare = false,
}: {
  group: PublicGroup
  size?: number
  bare?: boolean
}) {
  const identity = groupIdentity(group)
  const { fontScale } = useWindowDimensions()
  return (
    <View
      accessible={false}
      pointerEvents="none"
      style={[
        s.emblem,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: bare ? "transparent" : identity.color,
        },
      ]}
    >
      {identity.emblem ? (
        <Svg width={size * 0.74} height={size * 0.74} viewBox="0 0 40 40">
          <G
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2.1}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {identity.emblem === "drum" && (
              <>
                <Ellipse cx={19} cy={15} rx={11} ry={3.5} />
                <Path d="M8 15v17c4 4 18 4 22 0V15M9 19l5 12 5-11 5 11 5-12M19 14L31 3M23 15l12-3" />
              </>
            )}
            {identity.emblem === "waves" && (
              <>
                <Path d="M5 11c5-7 10 7 15 0s10 7 15 0M5 20c5-7 10 7 15 0s10 7 15 0M5 29c5-7 10 7 15 0s10 7 15 0" />
              </>
            )}
            {identity.emblem === "sun" && (
              <>
                <Circle cx={20} cy={20} r={7} fill="#FFFFFF" stroke="none" />
                <Path d="M20 3v5M20 32v5M3 20h5M32 20h5M8 8l3.5 3.5M28.5 28.5L32 32M8 32l3.5-3.5M28.5 11.5L32 8" />
              </>
            )}
            {identity.emblem === "spark" && (
              <Path d="M20 4l4.5 11.5L36 20l-11.5 4.5L20 36l-4.5-11.5L4 20l11.5-4.5Z" />
            )}
            {identity.emblem === "horizon" && (
              <>
                <Path d="M10 22a10 10 0 0 1 20 0M5 23h30" />
                <Line x1={9} y1={29} x2={31} y2={29} />
                <Line x1={14} y1={35} x2={26} y2={35} />
              </>
            )}
          </G>
        </Svg>
      ) : (
        <Text
          key={fontScale}
          accessible={false}
          numberOfLines={1}
          maxFontSizeMultiplier={1.5}
          style={{ color: "#FFFFFF", fontWeight: "700", fontSize: size * 0.33 }}
        >
          {identity.initials}
        </Text>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  emblem: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
})
