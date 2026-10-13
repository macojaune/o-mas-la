import { v } from "convex/values"

import { mutation, query } from "./_generated/server"
import { readCatalog } from "./catalog"
import { fail, nonempty, requireAdmin } from "./lib/security"

export const get = query({
  args: {},
  handler: async (ctx) => {
    const catalog = await readCatalog(ctx)
    return await Promise.all(
      catalog.groups.map(async (g) => {
        const original = await ctx.db.get(g.id)
        if (!original) return fail("GROUP_NOT_FOUND")
        return {
          _id: g.id,
          _creationTime: original._creationTime,
          title: g.title,
          isLive: g.live,
        }
      }),
    )
  },
})
export const create = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    nonempty(args.title, 200)
    return await ctx.db.insert("groups", {
      title: args.title.trim(),
      isLive: false,
    })
  },
})
export const update = mutation({
  args: { groupId: v.id("groups"), isLive: v.boolean() },
  handler: async (ctx) => {
    await requireAdmin(ctx)
    return fail("LEGACY_API_DISABLED")
  },
})
export const isLive = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.groupId)
    const session = group?.activeSessionId
      ? await ctx.db.get(group.activeSessionId)
      : null
    return session?.status === "active" && session.expiresAt > Date.now()
  },
})
