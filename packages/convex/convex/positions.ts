import { v } from "convex/values"

import type { Doc, Id } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"

export const byId = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    return await ctx.db
      .query("positions")
      .filter((q) => q.eq(q.field("group"), groupId)) //todo add time filter less than 6hours ?
      .collect()
  },
})

export const byGroups = query({
  handler: async (ctx) => {
    try {
      const positions = await ctx.db
        .query("positions")
        .order("desc")
        .filter((q) =>
          q.gte(
            q.field("_creationTime"),
new Date().getTime() - 1000 * 60 * 20
          ),
        )
        .collect()
      const result: Record<
        Id<"groups">,
        Doc<"groups"> & { positions: Doc<"positions">[] }
      > = {}

      for (const position of positions) {
        const groupId = position.group
        if (!result[groupId]) {
          const group = await ctx.db.get(groupId)
          if (!group) continue
          result[groupId] = {
            ...group,
            positions: [],
          }
        }
        result[groupId].positions.push(position)
      }

      return result
    } catch (e) {
      console.log(e)
      return {}
    }
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
  handler: async (ctx, { groupId, latitude, longitude, fromApp, owner }) => {
    return await ctx.db.insert("positions", {
      group: groupId,
      latitude,
      longitude,
      fromApp,
      owner: owner ?? undefined,
    })
  },
})
