"use client"

import Link from "next/link"
import { Menu } from "lucide-react"

import { Button } from "@oyo/ui/button"

export function NavigationBar({
  toggleSidebar,
}: {
  toggleSidebar?: () => void
}) {
  return (
    <header className="h-16 border-b bg-background">
      <div className="flex h-full items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Afficher ou masquer les groupes"
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/">
            <h1 className="text-xl font-bold hover:opacity-70">
              O Mas La ? <small className="text-sm">- La carte</small>
            </h1>
          </Link>
        </div>
      </div>
    </header>
  )
}
