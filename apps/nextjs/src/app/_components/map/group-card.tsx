import { formatDistance } from "date-fns"
import { fr } from "date-fns/locale"

import type { FreshnessPolicy, PublicGroup } from "@oyo/convex"
import { positionFreshness } from "@oyo/convex"
import { Card } from "@oyo/ui/card"

interface GroupCardProps {
  group: PublicGroup
  policy: FreshnessPolicy | null
  now: number
  isSelected: boolean
  onClick: () => void
}

export function GroupCard({
  group,
  policy,
  now,
  isSelected,
  onClick,
}: GroupCardProps) {
  const position = group.position
  const freshness = positionFreshness(position, policy, now)
  const canNavigate =
    position && (freshness === "recent" || freshness === "aging")
  const source =
    position?.source === "community"
      ? "Observation publique"
      : position?.source === "referent"
        ? "Position du référent"
        : "Position historique"
  return (
    <Card
      className={`p-4 transition-all hover:shadow-md ${isSelected ? "bg-purple-500/25" : "bg-background"}`}
    >
      <button
        type="button"
        className="w-full text-left"
        onClick={onClick}
        aria-pressed={isSelected}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">{group.title}</h3>
          {group.live && (
            <span className="shrink-0 rounded-md border border-primary px-2 py-1 text-xs">
              Live
            </span>
          )}
        </div>
        {position ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {source} ·{" "}
            {position.timestampBasis === "received" ? "reçue " : "observée "}
            {formatDistance(position.observedAt ?? position.receivedAt, now, {
              addSuffix: true,
              locale: fr,
            })}
            {freshness === "aging" && (
              <span className="block text-amber-700 dark:text-amber-400">
                Position ancienne
              </span>
            )}
            {freshness === "hidden" && (
              <span className="block">
                Position trop ancienne pour la carte
              </span>
            )}
            {freshness === "unconfigured" && (
              <span className="block">Fraîcheur non disponible</span>
            )}
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            {group.live
              ? "En attente de position du référent"
              : "Aucune position disponible"}
          </p>
        )}
      </button>
      {canNavigate && (
        <a
          className="mt-3 inline-block text-sm font-medium text-purple-700 underline dark:text-purple-300"
          href={`https://www.google.com/maps/dir/?api=1&destination=${position.latitude},${position.longitude}&travelmode=walking`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Rejoindre le dernier point connu
        </a>
      )}
    </Card>
  )
}
