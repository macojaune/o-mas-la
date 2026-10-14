import { mutation, query } from "./_generated/server"
import { ensureAccount, findAccount } from "./lib/security"

export const ensure = mutation({
  args: {},
  handler: async (ctx) => (await ensureAccount(ctx)).account._id,
})
export const me = query({
  args: {},
  handler: async (ctx) => {
    if (!(await ctx.auth.getUserIdentity())) return null
    const { account } = await findAccount(ctx)
    return account ? { id: account._id, role: account.role } : null
  },
})
