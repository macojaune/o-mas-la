"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"

import "mapbox-gl/dist/mapbox-gl.css"

import { useTheme } from "next-themes"

import type { Id } from "@oyo/convex"
import { positionFreshness } from "@oyo/convex"

import type { CatalogState } from "~/hooks/usePublicCatalog"
import { env } from "~/env"

interface MapComponentProps {
  selectedGroup: Id<"groups"> | null
  onGroupSelect: (groupId: Id<"groups">) => void
  catalog: CatalogState
}

export default function MapComponent({
  selectedGroup,
  onGroupSelect,
  catalog,
}: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<mapboxgl.Marker[]>([])
  const { resolvedTheme } = useTheme()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!mapContainer.current || !env.NEXT_PUBLIC_MAPBOX_TOKEN) return
    mapboxgl.accessToken = env.NEXT_PUBLIC_MAPBOX_TOKEN
    const instance = new mapboxgl.Map({
      container: mapContainer.current,
      style:
        resolvedTheme === "dark"
          ? "mapbox://styles/mapbox/dark-v11"
          : "mapbox://styles/mapbox/light-v11",
      center: [-61.533329, 16.241935],
      zoom: 14,
    })
    map.current = instance
    instance.addControl(new mapboxgl.NavigationControl())
    // Geolocation is requested only if the visitor presses this control.
    instance.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
    )
    instance.on("error", () =>
      setError(
        "La carte est indisponible. Les dernières informations restent consultables dans la liste.",
      ),
    )
    instance.on("load", () => setError(null))
    return () => {
      markers.current.forEach((marker) => marker.remove())
      markers.current = []
      instance.remove()
      map.current = null
    }
  }, [resolvedTheme])

  useEffect(() => {
    const instance = map.current
    if (!instance) return
    markers.current.forEach((marker) => marker.remove())
    markers.current = []
    for (const group of catalog.data?.groups ?? []) {
      const freshness = positionFreshness(
        group.position,
        catalog.data?.policy ?? null,
        catalog.now,
      )
      const position = group.position
      if (!position || (freshness !== "recent" && freshness !== "aging"))
        continue
      if (
        !Number.isFinite(position.longitude) ||
        !Number.isFinite(position.latitude)
      )
        continue
      const element = document.createElement("button")
      element.type = "button"
      element.textContent = group.title
      element.className = `rounded-md border px-3 py-2 text-sm font-semibold shadow ${freshness === "aging" ? "border-amber-700 bg-amber-100 text-amber-950" : "border-purple-900 bg-purple-700 text-white"}`
      element.setAttribute(
        "aria-label",
        `${group.title} — ${freshness === "aging" ? "position ancienne" : "position récente"}`,
      )
      element.addEventListener("click", () => onGroupSelect(group.id))
      markers.current.push(
        new mapboxgl.Marker({ element })
          .setLngLat([position.longitude, position.latitude])
          .addTo(instance),
      )
    }
  }, [catalog.data, catalog.now, onGroupSelect, resolvedTheme])

  const selected = catalog.data?.groups.find(
    (item) => item.id === selectedGroup,
  )
  const selectedFreshness = positionFreshness(
    selected?.position ?? null,
    catalog.data?.policy ?? null,
    catalog.now,
  )
  const selectedVisible =
    selectedFreshness === "recent" || selectedFreshness === "aging"
  const latitude = selectedVisible ? selected?.position?.latitude : undefined
  const longitude = selectedVisible ? selected?.position?.longitude : undefined
  useEffect(() => {
    if (latitude === undefined || longitude === undefined) return
    map.current?.flyTo({
      center: [longitude, latitude],
      zoom: 15,
      essential: false,
    })
  }, [selectedGroup, latitude, longitude, resolvedTheme])

  if (!env.NEXT_PUBLIC_MAPBOX_TOKEN)
    return (
      <div className="flex h-full min-h-64 items-center justify-center bg-muted p-8 text-center text-sm">
        La carte est indisponible. Consulte les groupes et leurs dernières
        positions dans la liste.
      </div>
    )
  return (
    <>
      <div ref={mapContainer} className="h-full w-full" />
      {error && (
        <p
          role="status"
          className="absolute left-4 right-4 top-4 rounded-md bg-background p-3 text-sm shadow"
        >
          {error}
        </p>
      )}
    </>
  )
}
