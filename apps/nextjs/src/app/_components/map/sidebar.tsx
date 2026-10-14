"use client"

import type { Id } from "@oyo/convex"
import { ScrollArea } from "@oyo/ui/scroll-area"

import type { CatalogState } from "~/hooks/usePublicCatalog"
import { AddPositionButton } from "./add-position-button"
import { GroupCard } from "./group-card"
import { SponsorBlock } from "./sponsor-block"

interface SidebarProps {
  isOpen: boolean
  selectedGroup: Id<"groups"> | null
  onGroupSelect: (groupId: Id<"groups">) => void
  catalog: CatalogState
}

export function Sidebar({
  isOpen,
  selectedGroup,
  onGroupSelect,
  catalog,
}: SidebarProps) {
  return (
    <div
      className={`w-full border-r bg-background lg:relative ${isOpen ? "h-[45dvh] lg:w-80" : "h-0 lg:w-0"} transition-all duration-300 lg:h-full`}
    >
      {isOpen && (
        <div className="flex h-full flex-col p-4 pb-20 lg:pb-4">
          <h2 className="mb-2 text-xl font-bold">Groupes</h2>
          {!catalog.online && (
            <p
              role="status"
              className="mb-2 text-xs text-amber-700 dark:text-amber-400"
            >
              {catalog.data
                ? "Hors ligne — dernières données reçues. Les déclarations sont suspendues."
                : "Connexion au serveur en cours. Les groupes apparaîtront après un premier chargement."}
            </p>
          )}
          <p className="mb-3 text-xs text-muted-foreground">
            L'itinéraire mène au point daté. Le groupe peut continuer à se
            déplacer.
          </p>
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-2">
              {!catalog.data ? (
                <p className="text-sm text-muted-foreground">
                  Chargement des groupes…
                </p>
              ) : catalog.data.groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun groupe référencé.
                </p>
              ) : (
                catalog.data.groups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    policy={catalog.data?.policy ?? null}
                    now={catalog.now}
                    isSelected={group.id === selectedGroup}
                    onClick={() => onGroupSelect(group.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
          <div className="mx-auto my-3 flex items-center justify-between gap-3 p-2">
            <SponsorBlock />
          </div>
          <AddPositionButton catalog={catalog} />
        </div>
      )}
    </div>
  )
}
