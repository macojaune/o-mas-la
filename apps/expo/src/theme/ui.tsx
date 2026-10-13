import type { PropsWithChildren } from "react"
import type { StyleProp, TextStyle, ViewStyle } from "react-native"
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native"
import Svg, { Circle, Path } from "react-native-svg"

const day = {
  background: "#f7f4ee",
  surface: "#ffffff",
  ink: "#24212c",
  muted: "#65606d",
  line: "#ddd8e4",
  primary: "#6021c7",
  primarySoft: "#eee5ff",
  primaryText: "#ffffff",
  success: "#176446",
  successSoft: "#e4f5ec",
  warning: "#845007",
  warningSoft: "#fff0d6",
  danger: "#b33234",
}
const night = {
  background: "#16141b",
  surface: "#211e29",
  ink: "#f7f4ee",
  muted: "#b9b2c3",
  line: "#45404e",
  primary: "#c0a1ff",
  primarySoft: "#33234b",
  primaryText: "#20132e",
  success: "#86d9b2",
  successSoft: "#173b30",
  warning: "#e8bd76",
  warningSoft: "#3e2e17",
  danger: "#ff999b",
}
export function usePalette() {
  return useColorScheme() === "dark" ? night : day
}
export type IconName =
  | "search"
  | "map"
  | "list"
  | "arrow"
  | "back"
  | "pin"
  | "clock"
  | "person"
  | "close"
  | "signal"
  | "check"
  | "refresh"
  | "crosshair"
  | "stop"
export function Icon({
  name,
  color,
  size = 22,
}: {
  name: IconName
  color: string
  size?: number
}) {
  const paths: Record<IconName, string> = {
    search: "m20 20-4.5-4.5",
    map: "m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16",
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    arrow: "M4 12h15m-6-6 6 6-6 6",
    back: "M20 12H5m6-6-6 6 6 6",
    pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z",
    clock: "M12 7v5l3 2",
    person: "M4 21v-2a8 8 0 0 1 16 0v2",
    close: "m6 6 12 12M6 18 18 6",
    signal: "M4 16a12 12 0 0 1 16 0M7 19a8 8 0 0 1 10 0M2 12a16 16 0 0 1 20 0",
    check: "m5 12 4 4L19 6",
    refresh:
      "M20 11a8 8 0 0 0-14-5L3 9m0-6v6h6m-5 4a8 8 0 0 0 14 5l3-3m0 6v-6h-6",
    crosshair: "M12 2v4m0 12v4M2 12h4m12 0h4",
    stop: "M6 6h12v12H6z",
  }
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={paths[name]} />
      {name === "search" && <Circle cx={10.5} cy={10.5} r={6.5} />}
      {name === "clock" && <Circle cx={12} cy={12} r={9} />}
      {name === "pin" && <Circle cx={12} cy={10} r={2.5} />}
      {name === "person" && <Circle cx={12} cy={7} r={4} />}
      {name === "crosshair" && <Circle cx={12} cy={12} r={6} />}
    </Svg>
  )
}
export function Label({
  children,
  style,
  muted = false,
  ...props
}: PropsWithChildren<{
  style?: StyleProp<TextStyle>
  muted?: boolean
  accessibilityRole?: "header"
}>) {
  const c = usePalette()
  return (
    <Text
      {...props}
      style={[styles.body, { color: muted ? c.muted : c.ink }, style]}
    >
      {children}
    </Text>
  )
}
export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  busy = false,
  icon,
  testID,
}: {
  title: string
  onPress: () => void
  variant?: "primary" | "secondary" | "danger"
  disabled?: boolean
  busy?: boolean
  icon?: IconName
  testID?: string
}) {
  const c = usePalette()
  const color =
    variant === "primary"
      ? c.primaryText
      : variant === "danger"
        ? c.danger
        : c.ink
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: variant === "primary" ? c.primary : c.surface,
          borderColor: variant === "primary" ? c.primary : c.line,
          opacity: disabled || busy ? 0.48 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={color} />
      ) : icon ? (
        <Icon name={icon} color={color} size={20} />
      ) : null}
      <Text style={[styles.buttonText, { color }]}>{title}</Text>
    </Pressable>
  )
}
export function Notice({
  children,
  tone = "normal",
  style,
}: PropsWithChildren<{
  tone?: "normal" | "warning" | "error"
  style?: StyleProp<ViewStyle>
}>) {
  const c = usePalette()
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.notice,
        { backgroundColor: tone === "warning" ? c.warningSoft : c.primarySoft },
        style,
      ]}
    >
      <Label
        style={{
          color:
            tone === "warning"
              ? c.warning
              : tone === "error"
                ? c.danger
                : c.ink,
          fontSize: 14,
          lineHeight: 21,
        }}
      >
        {children}
      </Label>
    </View>
  )
}
export const styles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 24 },
  title: {
    fontSize: 32,
    lineHeight: 37,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  heading: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  page: { flex: 1 },
  content: {
    paddingHorizontal: 22,
    paddingVertical: 20,
    gap: 20,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  button: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 16, lineHeight: 22, fontWeight: "700" },
  notice: { padding: 16, borderRadius: 12 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  section: { gap: 12 },
})
