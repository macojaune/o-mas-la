import { useEffect, useRef, useState } from "react"
import { Platform, StyleSheet, View } from "react-native"
import MapView, { Marker } from "react-native-maps"
import Constants from "expo-constants"

import type { PublicCatalog, PublicGroup } from "@oyo/convex"
import { positionFreshness } from "@oyo/convex"

import { visiblePosition } from "~/lib/catalog-model"
import { Button, Label, usePalette } from "~/theme/ui"

export interface GroupMapProps {
  catalog: PublicCatalog
  now: number
  selectedId?: string
  onSelect: (group: PublicGroup) => void
}
export default function GroupMap({
  catalog,
  now,
  selectedId,
  onSelect,
}: GroupMapProps) {
  const c = usePalette()
  const map = useRef<MapView>(null)
  const [ready, setReady] = useState(false)
  const [slow, setSlow] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 12_000)
    return () => clearTimeout(timer)
  }, [revision])
  const selected = catalog.groups.find((item) => item.id === selectedId)
  const point = selected ? visiblePosition(selected, catalog, now) : null
  const latitude = point?.latitude
  const longitude = point?.longitude
  useEffect(() => {
    if (ready && latitude !== undefined && longitude !== undefined)
      map.current?.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        300,
      )
  }, [latitude, longitude, ready])
  if (
    Platform.OS === "android" &&
    Constants.expoConfig?.extra?.androidMapsConfigured !== true
  )
    return (
      <View style={[s.unavailable, { backgroundColor: c.surface }]}>
        <Label style={{ fontWeight: "700" }}>
          Le fond de carte est indisponible
        </Label>
        <Label muted>
          La liste et les fiches des groupes restent consultables.
        </Label>
      </View>
    )
  return (
    <View style={s.wrap}>
      <MapView
        key={revision}
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: 16.241935,
          longitude: -61.533329,
          latitudeDelta: 0.035,
          longitudeDelta: 0.035,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onMapReady={() => setReady(true)}
        accessibilityLabel="Carte des dernières positions des groupes"
      >
        {catalog.groups.map((group) => {
          const position = visiblePosition(group, catalog, now)
          if (!position) return null
          const fresh = positionFreshness(position, catalog.policy, now)
          return (
            <Marker
              key={group.id}
              coordinate={position}
              title={group.title}
              description={
                fresh === "aging"
                  ? "Position ancienne"
                  : group.live
                    ? "Suivi en direct"
                    : "Observation datée"
              }
              pinColor={
                fresh === "aging"
                  ? c.warning
                  : group.live
                    ? c.primary
                    : c.success
              }
              onPress={() => onSelect(group)}
            />
          )
        })}
      </MapView>
      {!ready && slow && (
        <View style={[s.error, { backgroundColor: c.surface }]}>
          <Label muted>
            La carte met du temps à se charger. La liste reste accessible.
          </Label>
          <Button
            title="Réessayer la carte"
            variant="secondary"
            onPress={() => {
              setReady(false)
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
  wrap: { flex: 1, minHeight: 260 },
  unavailable: {
    flex: 1,
    minHeight: 260,
    padding: 28,
    justifyContent: "center",
    gap: 12,
  },
  error: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
    padding: 18,
    borderRadius: 14,
    gap: 12,
  },
})
