import type { PublicCatalog, PublicPosition } from "../src/contracts"
import type { Doc } from "./_generated/dataModel"
import type { QueryCtx } from "./_generated/server"
import { query } from "./_generated/server"

export function publicPosition(
  position: Doc<"positions"> | null,
): PublicPosition | null {
  if (!position || position.withdrawnAt !== undefined) return null
  return {
    id: position._id,
    latitude: position.latitude,
    longitude: position.longitude,
    source: position.source ?? "legacy",
    observedAt: position.observedAt ?? null,
    receivedAt: position.receivedAt ?? position._creationTime,
    timestampBasis: position.observedAt === undefined ? "received" : "observed",
  }
}
export async function readCatalog(ctx: QueryCtx): Promise<PublicCatalog> {
  const policy = await ctx.db.query("trackingPolicies").order("desc").first()
  const now = Date.now()
  const groups = await ctx.db.query("groups").collect()
  const result: PublicCatalog = {
    serverNow: now,
    policy: policy
      ? {
          freshForMs: policy.policy.freshForMs,
          hideAfterMs: policy.policy.hideAfterMs,
        }
      : null,
    groups: [],
  }
  for (const group of groups) {
    const session = group.activeSessionId
      ? await ctx.db.get(group.activeSessionId)
      : null
    const live = session?.status === "active" && session.expiresAt > now
    let position: Doc<"positions"> | null
    if (live)
      position = session.lastPositionId
        ? await ctx.db.get(session.lastPositionId)
        : null
    else
      position = group.lastPositionId
        ? await ctx.db.get(group.lastPositionId)
        : await ctx.db
            .query("positions")
            .withIndex("by_group", (q) => q.eq("group", group._id))
            .order("desc")
            .filter((q) => q.eq(q.field("withdrawnAt"), undefined))
            .first()
    result.groups.push({
      id: group._id,
      title: group.title,
      live: Boolean(live),
      canObserve: !live,
      position: publicPosition(position),
    })
  }
  result.groups.sort((a, b) => a.title.localeCompare(b.title, "fr"))
  return result
}
export const list = query({ args: {}, handler: readCatalog })
