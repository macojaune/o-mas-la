"use client"

import { useState } from "react"
import dynamic from "next/dynamic"

import type { Id } from "@oyo/convex"

import { usePublicCatalog } from "~/hooks/usePublicCatalog"
import { NavigationBar } from "../_components/map/navigation-bar"
import { Sidebar } from "../_components/map/sidebar"

const MapComponent = dynamic(() => import("../_components/map/map-component"), {
  loading: () => (
    <div className="flex h-full min-h-64 items-center justify-center bg-muted">
      Chargement de la carte…
    </div>
  ),
  ssr: false,
})

export default function MapPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<Id<"groups"> | null>(null)
  const catalog = usePublicCatalog()
  const toggleSelectedGroup = (id: Id<"groups">) =>
    setSelectedGroup((previous) => (previous !== id ? id : null))

  return (
    <div className="relative h-auto w-full lg:h-screen">
      <NavigationBar toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
      <div className="flex h-[calc(100dvh-4rem)] flex-col lg:flex-row">
        <div className="order-2 lg:order-1">
          <Sidebar
            isOpen={isSidebarOpen}
            selectedGroup={selectedGroup}
            onGroupSelect={toggleSelectedGroup}
            catalog={catalog}
          />
        </div>
        <main
          className="relative order-1 min-h-[35dvh] flex-1 lg:order-2"
          aria-label="Carte des groupes"
        >
          <MapComponent
            selectedGroup={selectedGroup}
            onGroupSelect={toggleSelectedGroup}
            catalog={catalog}
          />
        </main>
      </div>
    </div>
  )
}
