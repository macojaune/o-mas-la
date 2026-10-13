import { mutation } from "./_generated/server"
import { endSession } from "./lib/live"
import { identityClaims } from "./lib/security"

export const revokeCurrentSession = mutation({
  args: {},
  handler: async (ctx) => {
    const { identity, sid, expiresAt } = await identityClaims(ctx)
    const existing = await ctx.db
      .query("authSessions")
      .withIndex("by_sid", (q) => q.eq("sid", sid))
      .unique()
    if (!existing)
      await ctx.db.insert("authSessions", {
        sid,
        subject: identity.subject,
        issuer: identity.issuer,
        expiresAt,
        revokedAt: Date.now(),
      })
    else if (existing.revokedAt === undefined)
      await ctx.db.patch(existing._id, { revokedAt: Date.now() })
    const sessions = await ctx.db
      .query("liveSessions")
      .withIndex("by_auth_session", (q) => q.eq("emitterAuthSessionId", sid))
      .collect()
    for (const session of sessions)
      if (session.status === "active")
        await endSession(ctx, session, "logout", session.emitterAccountId)
    return { revoked: true }
  },
})
