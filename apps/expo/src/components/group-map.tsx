import type { CameraRef } from "@maplibre/maplibre-react-native"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  AccessibilityInfo,
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  Camera,
  Map,
  Marker,
  ViewAnnotation,
} from "@maplibre/maplibre-react-native"

import type { PublicCatalog, PublicGroup } from "@oyo/convex"
import { positionFreshness } from "@oyo/convex"

import GroupBanner, { GROUP_BANNER_OFFSET } from "~/components/group-banner"
import { createCarnivalMapStyle } from "~/lib/carnival-map-style"
import { ageLabel, positionLabel, visiblePosition } from "~/lib/catalog-model"
import { Button, Label, usePalette } from "~/theme/ui"

interface Coordinate {
  latitude: number
  longitude: number
}
export interface MapCameraRequest {
  kind: "overview" | "user" | "selection"
  id: number
  coordinate?: Coordinate
}
export interface GroupMapProps {
  catalog: PublicCatalog
  now: number
  selectedId?: string
  selectionReady?: boolean
  cameraReady?: boolean
  onSelect: (group: PublicGroup) => void
  bottomInset?: number
  leftInset?: number
  cameraRequest?: MapCameraRequest
  onPan?: () => void
  onMapPress?: () => void
  userLocation?: Coordinate | null
}

const initialCenter: [number, number] = [-61.5337, 16.2375]
const light = {
  position: [1.5, 220, 35] as [number, number, number],
  color: "#fff9e9",
  intensity: 0.38,
}
function validCoordinate(
  value: Coordinate | null | undefined,
): value is Coordinate {
  return Boolean(
    value &&
      Number.isFinite(value.latitude) &&
      Math.abs(value.latitude) <= 90 &&
      Number.isFinite(value.longitude) &&
      Math.abs(value.longitude) <= 180,
  )
}
function attribution() {
  Alert.alert(
    "Sources de la carte",
    "Fond : IGN — Plan IGN.\nBâtiments et hauteurs : IGN — BD TOPO®, via Plan IGN.\nLicence Ouverte 2.0.\n\nSeules les hauteurs disponibles sont représentées en relief.",
    [
      { text: "Fermer", style: "cancel" },
      {
        text: "Source IGN",
        onPress: () => {
          void Linking.openURL(
            "https://www.data.gouv.fr/datasets/bd-topo-r",
          ).catch(() => undefined)
        },
      },
    ],
  )
}

export default function GroupMap({
  catalog,
  now,
  selectedId,
  selectionReady = true,
  cameraReady = true,
  onSelect,
  bottomInset = 0,
  leftInset = 0,
  cameraRequest,
  onPan,
  onMapPress,
  userLocation,
}: GroupMapProps) {
  const c = usePalette()
  const { fontScale } = useWindowDimensions()
  const dark = useColorScheme() === "dark"
  const safe = useSafeAreaInsets()
  const camera = useRef<CameraRef>(null)
  const [ready, setReady] = useState(false)
  const [rendered, setRendered] = useState(false)
  const [slow, setSlow] = useState(false)
  const [revision, setRevision] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(true)
  const [relief, setRelief] = useState(true)
  const [zoom, setZoom] = useState(16.4)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const handled = useRef<{
    selection?: string
    request?: string
    revision: number
  }>({ revision: -1 })
  const style = useMemo(
    () => createCarnivalMapStyle(dark, relief),
    [dark, relief],
  )
  const visible = useMemo(
    () =>
      catalog.groups.flatMap((group) => {
        const position = visiblePosition(group, catalog, now)
        return position ? [{ group, position }] : []
      }),
    [catalog, now],
  )
  const padding = useMemo(
    () => ({
      top: safe.top + 118,
      right: safe.right + 104,
      bottom: Math.max(
        safe.bottom + 44,
        Math.min(bottomInset + 52, Math.max(44, size.height - safe.top - 284)),
      ),
      left: Math.max(
        safe.left + 28,
        Math.min(leftInset + 28, Math.max(28, size.width - 200)),
      ),
    }),
    [
      safe.top,
      safe.right,
      safe.bottom,
      safe.left,
      bottomInset,
      leftInset,
      size.height,
      size.width,
    ],
  )
  useEffect(() => {
    let mounted = true
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled)
      })
      .catch(() => undefined)
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    )
    return () => {
      mounted = false
      subscription.remove()
    }
  }, [])
  useEffect(() => {
    if (rendered) return
    const timer = setTimeout(() => setSlow(true), 12_000)
    return () => clearTimeout(timer)
  }, [rendered, revision])
  useEffect(() => {
    if (!ready || !size.width || !size.height || !camera.current) return
    if (handled.current.revision !== revision) handled.current = { revision }
    const requestKey = cameraRequest
      ? `${cameraRequest.kind}:${cameraRequest.id}:${size.width}:${size.height}:${fontScale}`
      : undefined
    const explicitRequest =
      requestKey !== undefined && requestKey !== handled.current.request
    if (explicitRequest && !cameraReady) return
    const newSelection =
      selectedId !== undefined && selectedId !== handled.current.selection
    if (!explicitRequest && !newSelection) {
      if (!selectedId) handled.current.selection = undefined
      return
    }
    const kind = explicitRequest ? cameraRequest?.kind : "selection"
    if (kind === "selection" && !selectionReady) return
    const options = {
      padding,
      pitch: relief ? 42 : 0,
      bearing: -12,
      duration: reduceMotion ? 0 : 600,
    }
    if (kind === "overview" && visible.length > 1) {
      const lons = visible.map(({ position }) => position.longitude)
      const lats = visible.map(({ position }) => position.latitude)
      camera.current.fitBounds(
        [
          Math.min(...lons) - 0.00035,
          Math.min(...lats) - 0.00035,
          Math.max(...lons) + 0.00035,
          Math.max(...lats) + 0.00035,
        ],
        {
          ...options,
          // Distant groups use compact flags; leave enough space for a flag
          // without zooming out to reserve the width of a full name plaque.
          padding,
        },
      )
    } else {
      const candidate =
        kind === "user"
          ? (cameraRequest?.coordinate ?? userLocation)
          : kind === "overview"
            ? (visible[0]?.position ?? {
                longitude: initialCenter[0],
                latitude: initialCenter[1],
              })
            : cameraRequest?.kind === "selection" &&
                explicitRequest &&
                cameraRequest.coordinate
              ? cameraRequest.coordinate
              : visible.find(({ group }) => group.id === selectedId)?.position
      if (!validCoordinate(candidate)) return
      camera.current.easeTo({
        center: [candidate.longitude, candidate.latitude],
        zoom: kind === "overview" ? 16.4 : 17.2,
        ...options,
      })
    }
    if (explicitRequest) handled.current.request = requestKey
    handled.current.selection = selectedId
    // New GPS points update banners without taking the camera away from a gesture.
  }, [
    ready,
    size.width,
    size.height,
    revision,
    cameraRequest,
    cameraReady,
    selectedId,
    selectionReady,
    userLocation,
    visible,
    padding,
    reduceMotion,
    fontScale,
    relief,
  ])
  return (
    <View
      style={[s.wrap, { backgroundColor: c.background }]}
      onLayout={({ nativeEvent }) => setSize(nativeEvent.layout)}
    >
      <Map
        key={revision}
        style={StyleSheet.absoluteFill}
        mapStyle={style}
        light={light}
        logo={false}
        attribution={false}
        compass={false}
        touchPitch
        onDidFinishLoadingStyle={() => setReady(true)}
        onWillStartLoadingMap={() => {
          setRendered(false)
          setSlow(false)
        }}
        onDidFinishRenderingMapFully={() => {
          setRendered(true)
          setSlow(false)
        }}
        onDidFailLoadingMap={() => {
          setReady(false)
          setRendered(false)
          setSlow(true)
        }}
        onRegionWillChange={(event) => {
          if (event.nativeEvent.userInteraction) onPan?.()
        }}
        onRegionDidChange={(event) => {
          setZoom(event.nativeEvent.zoom)
          if (event.nativeEvent.userInteraction)
            setRelief(event.nativeEvent.pitch > 10)
        }}
        onPress={onMapPress}
        accessibilityLabel="Carte des groupes, bâtiments en relief à Pointe-à-Pitre"
      >
        <Camera
          ref={camera}
          initialViewState={{
            center: initialCenter,
            zoom: 16.4,
            pitch: 42,
            bearing: -12,
          }}
          minZoom={4}
          maxZoom={20}
        />
        {visible.map(({ group, position }) => {
          const freshness = positionFreshness(position, catalog.policy, now)
          const state =
            freshness === "aging"
              ? "aging"
              : group.live && position.source === "referent"
                ? "live"
                : position.source === "community"
                  ? "community"
                  : "legacy"
          const selected = selectedId === group.id
          const description = `${group.title}. ${positionLabel(group, catalog, now)}, ${ageLabel(position, now)}. Voir le groupe`
          const banner = (
            <GroupBanner
              group={group}
              selected={selected}
              compact={zoom < 16}
              state={state}
              label={positionLabel(group, catalog, now)}
              age={ageLabel(position, now)}
              // iOS routes taps through the native annotation, once.
              onPress={
                Platform.OS === "ios" ? undefined : () => onSelect(group)
              }
            />
          )
          const markerProps = {
            id: group.id,
            lngLat: [position.longitude, position.latitude] as [number, number],
            anchor: "bottom-left" as const,
            offset: GROUP_BANNER_OFFSET,
            selected,
          }
          return Platform.OS === "ios" ? (
            <ViewAnnotation
              key={`${group.id}:${fontScale}`}
              {...markerProps}
              title={description}
              onPress={(event) => {
                event.stopPropagation()
                onSelect(group)
              }}
            >
              {banner}
            </ViewAnnotation>
          ) : (
            <Marker
              key={`${group.id}:${fontScale}`}
              {...markerProps}
              accessibilityLabel={description}
            >
              {banner}
            </Marker>
          )
        })}
        {validCoordinate(userLocation) && (
          <Marker
            id="user-position"
            lngLat={[userLocation.longitude, userLocation.latitude]}
            accessibilityLabel="Votre position"
          >
            <View
              style={[
                s.userPosition,
                { backgroundColor: c.primary, borderColor: c.surface },
              ]}
            />
          </Marker>
        )}
      </Map>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          relief
            ? "Passer à la carte à plat"
            : "Afficher les bâtiments en relief"
        }
        onPress={() => {
          void camera.current
            ?.setStop({
              pitch: relief ? 0 : 42,
              duration: reduceMotion ? 0 : 450,
              padding,
            })
            .catch(() => undefined)
          setRelief(!relief)
        }}
        style={[
          s.relief,
          {
            top: safe.top + 82,
            right: safe.right + 16,
            backgroundColor: c.surface,
          },
        ]}
      >
        <Label
          maxFontSizeMultiplier={1.5}
          style={{ fontSize: 15, fontWeight: "700" }}
        >
          {relief ? "2D" : "3D"}
        </Label>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sources et attribution IGN de la carte"
        onPress={attribution}
        style={[
          s.attribution,
          {
            left: safe.left + 180,
            top: safe.top + 14,
          },
        ]}
      >
        <Label
          maxFontSizeMultiplier={1.5}
          style={[
            s.attributionText,
            { color: c.ink, backgroundColor: c.surface },
          ]}
        >
          © IGN
        </Label>
      </Pressable>
      {!rendered && slow && (
        <View
          style={[
            s.loadError,
            {
              left: Math.max(20, leftInset + 20),
              right: 20,
              bottom: Math.max(safe.bottom + 28, bottomInset + 20),
              backgroundColor: c.surface,
            },
          ]}
        >
          <Label style={s.messageTitle}>
            La carte prend du temps à charger
          </Label>
          <Label muted style={s.messageText}>
            Vous pouvez consulter les groupes dans la liste.
          </Label>
          <Button
            title="Réessayer la carte"
            variant="secondary"
            onPress={() => {
              setReady(false)
              setRendered(false)
              setSlow(false)
              setRevision((value) => value + 1)
            }}
          />
        </View>
      )}
    </View>
  )
}
const s = StyleSheet.create({
  wrap: { flex: 1 },
  relief: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#142e32",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  attribution: {
    position: "absolute",
    minWidth: 48,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  attributionText: {
    fontSize: 11,
    lineHeight: 16,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
  },
  userPosition: { width: 18, height: 18, borderRadius: 9, borderWidth: 3 },
  loadError: { position: "absolute", gap: 10, padding: 18, borderRadius: 16 },
  messageTitle: { fontSize: 15, lineHeight: 20, fontWeight: "600" },
  messageText: { fontSize: 13, lineHeight: 18 },
})
