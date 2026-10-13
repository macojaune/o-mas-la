"use client"

import { useEffect, useRef, useState } from "react"
import { ConvexHttpClient } from "convex/browser"
import { ConvexError } from "convex/values"
import { Loader2 } from "lucide-react"
import { getProviders, signIn, useSession } from "next-auth/react"

import { api } from "@oyo/convex"
import { Button } from "@oyo/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@oyo/ui/dialog"
import { Label } from "@oyo/ui/label"
import { toast } from "@oyo/ui/toast"

import type { CatalogState } from "~/hooks/usePublicCatalog"
import { env } from "~/env"
import { useGeolocation } from "~/hooks/useGeolocation"

const draftKey = "omasla-observation-draft"
const networkAvailable = () => navigator.onLine
interface Draft {
  groupId: string
}

function readDraft(): Draft | null {
  try {
    const value: unknown = JSON.parse(
      sessionStorage.getItem(draftKey) ?? "null",
    )
    if (!value || typeof value !== "object") return null
    const draft = value as Partial<Draft>
    if (typeof draft.groupId !== "string") return null
    return { groupId: draft.groupId }
  } catch {
    return null
  }
}

function observationError(error: unknown) {
  const data: unknown = error instanceof ConvexError ? error.data : null
  const code =
    data &&
    typeof data === "object" &&
    "code" in data &&
    typeof data.code === "string"
      ? data.code
      : ""
  if (code.includes("GROUP_ALREADY_LIVE"))
    return "Le référent a démarré le live. Sa position est prioritaire ; ta déclaration n'a pas été publiée."
  if (code.includes("INVALID_OBSERVATION_TIME"))
    return "La position est trop ancienne. Actualise-la avant de publier."
  if (code.includes("CONFIGURATION_REQUIRED"))
    return "Les déclarations ne sont pas encore ouvertes."
  if (
    code === "AUTH_REQUIRED" ||
    code === "AUTH_REVOKED" ||
    code === "AUTH_EXPIRED"
  )
    return "Ta session a expiré. Reconnecte-toi avant de publier."
  return "Envoi non confirmé. Vérifie la connexion avant de réessayer ; aucun envoi automatique n'est prévu."
}

export function AddPositionDialog({
  isOpen,
  onOpenChange,
  catalog,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  catalog: CatalogState
}) {
  const { status } = useSession()
  const {
    error: locationError,
    isLocating,
    requestPosition,
    reset,
  } = useGeolocation()
  const [selectedGroup, setSelectedGroup] = useState("")
  const [isSubmitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const request = useRef<{ id: string; groupId: string } | null>(null)
  const selected = catalog.data?.groups.find(
    (group) => group.id === selectedGroup,
  )
  const latest = useRef({ selected, status })
  latest.current = { selected, status }

  useEffect(() => {
    const saved = readDraft()
    if (saved) {
      setSelectedGroup(saved.groupId)
    }
    if (new URLSearchParams(window.location.search).get("declaration") === "1")
      onOpenChange(true)
  }, [onOpenChange])

  const attempt = useRef(0)
  useEffect(() => {
    if (!isOpen) {
      attempt.current += 1
      setSubmitting(false)
      reset()
    }
    return () => {
      attempt.current += 1
    }
  }, [isOpen, reset])

  async function connect() {
    setError(null)
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({ groupId: selectedGroup }),
      )
      const providers = await getProviders()
      if (!providers || Object.keys(providers).length === 0) {
        setError(
          "La connexion n'est pas encore disponible. Tu peux continuer à consulter les groupes.",
        )
        return
      }
      await signIn(undefined, { redirectTo: "/map?declaration=1" })
    } catch {
      setError("La connexion est indisponible. Réessaie dans un instant.")
    }
  }

  async function submit() {
    setError(null)
    if (!catalog.online || !networkAvailable()) {
      setError("Les déclarations sont bloquées hors ligne.")
      return
    }
    if (
      status !== "authenticated" ||
      !selected ||
      (!selected.canObserve && request.current?.groupId !== selected.id) ||
      isSubmitting
    )
      return
    const currentAttempt = ++attempt.current
    setSubmitting(true)
    try {
      const auth = await fetch("/api/auth/convex-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        credentials: "same-origin",
        cache: "no-store",
      })
      if (!auth.ok) throw new Error("Session invalid")
      const body = (await auth.json()) as { token?: unknown }
      if (typeof body.token !== "string") throw new Error("Session invalid")
      if (!networkAvailable() || currentAttempt !== attempt.current) return
      const client = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL)
      client.setAuth(body.token)
      if (request.current?.groupId !== selected.id)
        request.current = { groupId: selected.id, id: crypto.randomUUID() }
      const requestId = request.current.id
      const acknowledge = () => {
        sessionStorage.removeItem(draftKey)
        request.current = null
        toast.success("Ton observation a été enregistrée avec son heure.")
        onOpenChange(false)
      }
      // A lost response is confirmed first; a retry never republishes an old GPS fix.
      const published = await client.query(api.observations.byRequest, {
        requestId,
      })
      if (currentAttempt !== attempt.current) return
      if (published?.groupId === selected.id) {
        acknowledge()
        return
      }
      if (!latest.current.selected?.canObserve) {
        setError(
          "Ce groupe est maintenant en live. La déclaration est bloquée.",
        )
        return
      }
      const position = await requestPosition()
      if (
        !position ||
        currentAttempt !== attempt.current ||
        latest.current.status !== "authenticated"
      )
        return
      if (!networkAvailable()) throw new Error("Network unavailable")
      const point = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        observedAt: position.timestamp,
      }
      try {
        // Direct HTTP has no durable/offline mutation queue.
        await client.mutation(api.observations.create, {
          groupId: selected.id,
          ...point,
          requestId,
        })
      } catch (failure) {
        const confirmed = networkAvailable()
          ? await client
              .query(api.observations.byRequest, { requestId })
              .catch(() => null)
          : null
        if (confirmed?.groupId !== selected.id) throw failure
      }
      if (currentAttempt !== attempt.current) return
      acknowledge()
    } catch (failure) {
      if (currentAttempt === attempt.current)
        setError(observationError(failure))
    } finally {
      if (currentAttempt === attempt.current) setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95dvw] sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Déclarer la position d'un groupe</DialogTitle>
          <DialogDescription>
            Publie seulement si le groupe est près de toi : ta position actuelle
            et l’heure du relevé seront partagées. Pendant le live, seul le
            référent partage sa position.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="observation-group">Groupe</Label>
          <select
            id="observation-group"
            value={selectedGroup}
            disabled={isSubmitting}
            onChange={(event) => {
              setSelectedGroup(event.target.value)
              setError(null)
            }}
            className="h-11 w-full rounded-md border bg-background px-3"
          >
            <option value="">Sélectionner un groupe</option>
            {catalog.data?.groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.title}
                {group.live ? " — en live" : ""}
              </option>
            ))}
          </select>
          {selected && !selected.canObserve && (
            <p
              role="status"
              className="text-sm text-amber-700 dark:text-amber-400"
            >
              Ce groupe est en live. Sa position est fournie par le référent ;
              la déclaration est bloquée.
            </p>
          )}
          {status !== "authenticated" ? (
            <>
              <p className="text-sm text-muted-foreground">
                Un compte est nécessaire pour publier. Ton groupe sélectionné
                sera conservé pendant la connexion.
              </p>
              <Button
                onClick={() => void connect()}
                disabled={status === "loading"}
              >
                Se connecter
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              La localisation sera demandée à l’envoi. Aucun ancien relevé ne
              sera publié et l’heure ne peut pas être modifiée.
            </p>
          )}
          {!catalog.online && (
            <p
              role="status"
              className="text-sm text-amber-700 dark:text-amber-400"
            >
              Connexion nécessaire pour déclarer une position.
            </p>
          )}
          {(error ?? locationError) && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {error ?? locationError}
            </p>
          )}
        </div>
        <DialogFooter className="mt-4 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={
              status !== "authenticated" ||
              !catalog.online ||
              !selected ||
              (!selected.canObserve &&
                request.current?.groupId !== selected.id) ||
              isSubmitting
            }
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
            {isLocating
              ? "Recherche de position…"
              : "Publier ma position actuelle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
