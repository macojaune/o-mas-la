import { v } from "convex/values"

import type { Id } from "./_generated/dataModel"
import { internalMutation } from "./_generated/server"
import { fail } from "./lib/security"

/** Synthetic local-only data for API/runtime validation; never an operational policy or real group. */
export const seedScenario = internalMutation({
  args: {
    issuer: v.string(),
    adminSubject: v.string(),
    referentSubject: v.string(),
    otherReferentSubject: v.string(),
    spectatorSubject: v.string(),
  },
  handler: async (ctx, args) => {
    const url = new URL(args.issuer)
    if (
      process.env.ALLOW_LOCAL_FIXTURES !== "true" ||
      args.issuer !== process.env.AUTH_ISSUER_URL ||
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
      return fail("LOCAL_FIXTURES_DISABLED")
    const principals = [
      { key: "admin", subject: args.adminSubject, role: "admin" as const },
      {
        key: "referent",
        subject: args.referentSubject,
        role: "spectator" as const,
      },
      {
        key: "otherReferent",
        subject: args.otherReferentSubject,
        role: "spectator" as const,
      },
      {
        key: "spectator",
        subject: args.spectatorSubject,
        role: "spectator" as const,
      },
    ]
    if (new Set(principals.map((p) => p.subject)).size !== principals.length)
      return fail("FIXTURE_SUBJECTS_MUST_DIFFER")
    const ids: Record<string, Id<"accounts">> = {}
    for (const principal of principals) {
      const tokenIdentifier = `${args.issuer}|${principal.subject}`
      const existing = await ctx.db
        .query("accounts")
        .withIndex("by_identity", (q) =>
          q.eq("tokenIdentifier", tokenIdentifier),
        )
        .unique()
      if (existing) ids[principal.key] = existing._id
      else
        ids[principal.key] = await ctx.db.insert("accounts", {
          tokenIdentifier,
          subject: principal.subject,
          issuer: args.issuer,
          displayName: `[SIMULATION] ${principal.key}`,
          role: principal.role,
        })
    }
    const adminId = ids.admin
    const referentId = ids.referent
    const otherReferentId = ids.otherReferent
    if (!adminId || !referentId || !otherReferentId)
      return fail("FIXTURE_INCOMPLETE")
    const title = "[SIMULATION LOCALE] Groupe témoin"
    const group = await ctx.db
      .query("groups")
      .filter((q) => q.eq(q.field("title"), title))
      .unique()
    const groupId =
      group?._id ?? (await ctx.db.insert("groups", { title, isLive: false }))
    const noPositionTitle = "[SIMULATION LOCALE] Groupe sans position"
    if (
      !(await ctx.db
        .query("groups")
        .filter((q) => q.eq(q.field("title"), noPositionTitle))
        .unique())
    )
      await ctx.db.insert("groups", { title: noPositionTitle, isLive: false })
    for (const accountId of [referentId, otherReferentId]) {
      const grant = await ctx.db
        .query("groupReferents")
        .withIndex("by_account_group", (q) =>
          q.eq("accountId", accountId).eq("groupId", groupId),
        )
        .unique()
      if (!grant)
        await ctx.db.insert("groupReferents", {
          accountId,
          groupId,
          grantedBy: adminId,
          grantedAt: Date.now(),
        })
    }
    let policy = await ctx.db.query("trackingPolicies").first()
    if (!policy) {
      const policyId = await ctx.db.insert("trackingPolicies", {
        createdBy: adminId,
        createdAt: Date.now(),
        policy: {
          freshForMs: 15_000,
          hideAfterMs: 45_000,
          maxDurationMs: 3_600_000,
          maxFutureSkewMs: 1000,
          maxSampleAgeMs: 120_000,
          maxAccuracyMeters: 50,
          zone: {
            latitude: 16.24,
            longitude: -61.53,
            radiusMeters: 1000,
            confirmationMs: 20_000,
          },
          speed: {
            thresholdMps: 10,
            persistenceMs: 10_000,
            warningMs: 10_000,
            maxGapMs: 15_000,
          },
        },
      })
      policy = await ctx.db.get(policyId)
    }
    return { synthetic: true, accounts: ids, groupId, policyId: policy?._id }
  },
})
