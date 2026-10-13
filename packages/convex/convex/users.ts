import { v } from "convex/values"

import { mutation, query } from "./_generated/server"
import { fail, requireAccount, requireModerator } from "./lib/security"

// IDs in this historical table identify anonymous installations, never authenticated accounts.
export const create = mutation({
  args: { pushToken: v.string() },
  handler: async (ctx) => {
    await requireAccount(ctx)
    return fail("LEGACY_API_DISABLED")
  },
})
export const startTracking = mutation({
  args: { userId: v.id("users"), group: v.id("groups") },
  handler: async (ctx) => {
    await requireAccount(ctx)
    return fail("LEGACY_API_DISABLED")
  },
})
export const stopTracking = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx) => {
    await requireAccount(ctx)
    return fail("LEGACY_API_DISABLED")
  },
})
export const getActiveUsers = query({
  args: { group: v.id("groups") },
  handler: async (ctx, args) => {
    await requireModerator(ctx)
    return (
      await ctx.db
        .query("users")
        .filter((q) =>
          q.and(
            q.eq(q.field("group"), args.group),
            q.eq(q.field("isActive"), true),
          ),
        )
        .collect()
    ).map(({ _id, group, isActive }) => ({ _id, group, isActive }))
  },
})
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireModerator(ctx)
    return (await ctx.db.query("users").collect()).map(
      ({ _id, group, isActive }) => ({ _id, group, isActive }),
    )
  },
})
