import type { PropsWithChildren } from "react"
import type { StyleProp, TextProps, ViewStyle } from "react-native"
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native"
import { SymbolView } from "expo-symbols"

const day = {
  isDark: false,
  background: "#F3F5F8",
  surface: "#ffffff",
  ink: "#172033",
  muted: "#5E697A",
  line: "#E2E6EC",
  primary: "#1765E8",
  primarySoft: "#EAF1FF",
  primaryText: "#ffffff",
  success: "#16734C",
  successSoft: "#E8F5EE",
  warning: "#89550B",
  warningSoft: "#FFF3DC",
  danger: "#b33234",
}
const night = {
  isDark: true,
  background: "#111820",
  surface: "#202935",
  ink: "#F3F5F8",
  muted: "#AEBACA",
  line: "#354354",
  primary: "#82B3FF",
  primarySoft: "#213855",
  primaryText: "#101B2C",
  success: "#86d9b2",
  successSoft: "#173b30",
  warning: "#e8bd76",
  warningSoft: "#3e2e17",
  danger: "#ff999b",
}
export function usePalette() {
  return useColorScheme() === "dark" ? night : day
}
const symbols = {
  search: { ios: "magnifyingglass", android: "search", web: "search" },
  map: { ios: "map", android: "map", web: "map" },
  list: { ios: "list.bullet", android: "list", web: "list" },
  arrow: { ios: "arrow.up.right", android: "north_east", web: "north_east" },
  back: { ios: "chevron.left", android: "arrow_back", web: "arrow_back" },
  pin: {
    ios: "mappin.and.ellipse",
    android: "location_on",
    web: "location_on",
  },
  clock: { ios: "clock", android: "schedule", web: "schedule" },
  person: {
    ios: "person.crop.circle",
    android: "account_circle",
    web: "account_circle",
  },
  close: { ios: "xmark", android: "close", web: "close" },
  signal: {
    ios: "dot.radiowaves.left.and.right",
    android: "sensors",
    web: "sensors",
  },
  check: { ios: "checkmark", android: "check", web: "check" },
  refresh: { ios: "arrow.clockwise", android: "refresh", web: "refresh" },
  crosshair: { ios: "location", android: "my_location", web: "my_location" },
  stop: { ios: "stop.fill", android: "stop", web: "stop" },
  walk: {
    ios: "figure.walk",
    android: "directions_walk",
    web: "directions_walk",
  },
  chevron: {
    ios: "chevron.right",
    android: "chevron_right",
    web: "chevron_right",
  },
  down: { ios: "chevron.down", android: "expand_more", web: "expand_more" },
  expand: { ios: "chevron.up", android: "expand_less", web: "expand_less" },
  overview: {
    ios: "arrow.up.left.and.arrow.down.right",
    android: "zoom_out_map",
    web: "zoom_out_map",
  },
  info: { ios: "info.circle", android: "info", web: "info" },
  offline: { ios: "wifi.slash", android: "wifi_off", web: "wifi_off" },
} as const
export type IconName = keyof typeof symbols
export function Icon({
  name,
  color,
  size = 22,
}: {
  name: IconName
  color: string
  size?: number
}) {
  return (
    <SymbolView
      name={symbols[name]}
      tintColor={color}
      size={size}
      weight="medium"
      style={{ width: size, height: size }}
    />
  )
}
export function Label({
  children,
  style,
  muted = false,
  ...props
}: PropsWithChildren<TextProps & { muted?: boolean }>) {
  const c = usePalette()
  const { fontScale } = useWindowDimensions()
  return (
    <Text
      // Remeasure native text when Dynamic Type changes while the app is open.
      key={fontScale}
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
  const { fontScale } = useWindowDimensions()
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
          backgroundColor: variant === "primary" ? c.primary : c.primarySoft,
          borderColor: variant === "primary" ? c.primary : c.line,
          opacity: disabled || busy ? 0.5 : pressed ? 0.72 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={color} />
      ) : icon ? (
        <Icon name={icon} color={color} size={20} />
      ) : null}
      <Text key={fontScale} style={[styles.buttonText, { color }]}>
        {title}
      </Text>
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
  body: { fontSize: 17, lineHeight: 25 },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700",
    letterSpacing: -0.6,
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
    borderRadius: 16,
    borderWidth: 0,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "center",
  },
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
