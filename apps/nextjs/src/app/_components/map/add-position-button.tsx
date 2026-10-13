"use client"

import { useState } from "react"
import { MapPin } from "lucide-react"

import { Button } from "@oyo/ui/button"

import type { CatalogState } from "~/hooks/usePublicCatalog"
import { AddPositionDialog } from "./add-position-dialog"

export function AddPositionButton({ catalog }: { catalog: CatalogState }) {
  const [isDialogOpen, setDialogOpen] = useState(false)
  return (
    <>
      <Button
        size="lg"
        className="fixed bottom-0 left-0 w-full rounded-none bg-purple-600 py-8 text-white hover:bg-purple-700 lg:relative lg:mt-auto lg:w-auto lg:rounded-sm lg:py-0"
        onClick={() => setDialogOpen(true)}
      >
        <MapPin className="mr-2 h-5 w-5" /> Ajouter une position
      </Button>
      <AddPositionDialog
        isOpen={isDialogOpen}
        onOpenChange={setDialogOpen}
        catalog={catalog}
      />
    </>
  )
}
