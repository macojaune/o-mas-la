import type { PublicGroup } from "@oyo/convex"

export type DemoEmblem = "drum" | "waves" | "sun" | "spark" | "horizon"

export interface GroupIdentity {
  name: string
  color: string
  initials: string
  isDemo: boolean
  emblem: DemoEmblem | null
}

// These drawn identities belong only to the explicitly labelled local fixtures.
// A real group gets a stable monogram until its own identity is supplied.
const demoIdentities: Record<string, { color: string; emblem: DemoEmblem }> = {
  "Tambour bleu": { color: "#145BD6", emblem: "drum" },
  Brise: { color: "#08745E", emblem: "waves" },
  "Soleil orange": { color: "#B94F12", emblem: "sun" },
  Éclat: { color: "#A43778", emblem: "spark" },
  Horizon: { color: "#365C85", emblem: "horizon" },
}

const monogramColors = [
  "#245B8F",
  "#675183",
  "#9B5138",
  "#39675E",
  "#874766",
  "#60612F",
] as const

export function groupIdentity(
  group: Pick<PublicGroup, "id" | "title">,
): GroupIdentity {
  const isDemo = group.title.endsWith(" · démo")
  const name = group.title.replace(/ · démo$/, "").trim()
  const demo = isDemo ? demoIdentities[name] : undefined
  let hash = 0
  for (const char of group.id)
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0
  return {
    name,
    isDemo,
    emblem: demo?.emblem ?? null,
    color:
      demo?.color ??
      monogramColors[hash % monogramColors.length] ??
      monogramColors[0],
    initials:
      name
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => Array.from(word)[0] ?? "")
        .join("")
        .toLocaleUpperCase("fr") || "?",
  }
}
