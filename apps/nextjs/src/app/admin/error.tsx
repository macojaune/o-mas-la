"use client"

import Link from "next/link"

import { Button } from "@oyo/ui/button"

export default function AdministrationError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl space-y-5 px-6 py-12">
      <h1 className="text-2xl font-semibold">La permanence est indisponible</h1>
      <p>
        La connexion a été interrompue ou tes droits ont changé. Aucune nouvelle
        action n’est confirmée.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>Réessayer</Button>
        <Button asChild variant="outline">
          <Link href="/map">Retour aux groupes</Link>
        </Button>
      </div>
    </main>
  )
}
