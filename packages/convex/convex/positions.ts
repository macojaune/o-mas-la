import { v } from "convex/values"

import type { Id } from "./_generated/dataModel"
import { positionFreshness } from "../src/contracts"
import { mutation, query } from "./_generated/server"
import { readCatalog } from "./catalog"
import { fail, requireAccount, requireModerator } from "./lib/security"

// Historical reads are restricted; public consumers receive a single sanitised position via catalog.list.
export const byId = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    await requireModerator(ctx)
    return await ctx.db
      .query("positions")
      .withIndex("by_group", (q) => q.eq("group", args.groupId))
      .collect()
  },
})
export const byGroups = query({
  args: {},
  handler: async (ctx) => {
    const catalog = await readCatalog(ctx)
    const result: Record<
      string,
      {
        _id: Id<"groups">
        title: string
        isLive: boolean
        positions: {
          _id: Id<"positions">
          _creationTime: number
          latitude: number
          longitude: number
          group: Id<"groups">
          fromApp: boolean
        }[]
      }
    > = {}
    for (const group of catalog.groups) {
      const fresh = positionFreshness(
        group.position,
        catalog.policy,
        catalog.serverNow,
      )
      if (!group.position || fresh === "hidden" || fresh === "unconfigured")
        continue
      const position = group.position
      result[group.id] = {
        _id: group.id,
        title: group.title,
        isLive: group.live,
        positions: [
          {
            _id: position.id,
            _creationTime: position.observedAt ?? position.receivedAt,
            latitude: position.latitude,
            longitude: position.longitude,
            group: group.id,
            fromApp: position.source === "referent",
          },
        ],
      }
    }
    return result
  },
})
export const sendPosition = mutation({
  args: {
    groupId: v.id("groups"),
    latitude: v.number(),
    longitude: v.number(),
    fromApp: v.boolean(),
    owner: v.optional(v.id("users")),
  },
  handler: async (ctx) => {
    await requireAccount(ctx)
    return fail("LEGACY_API_DISABLED")
  },
})
