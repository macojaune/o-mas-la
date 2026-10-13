import { ConvexError, v } from "convex/values"

import { action } from "./_generated/server"

// The old public broadcast is deliberately closed. Operational events are scoped to live sessions.
export const sendPushToAll = action({
  args: {
    title: v.string(),
    body: v.string(),
    data: v.optional(v.record(v.string(), v.any())),
  },
  handler: () => {
    throw new ConvexError({ code: "LEGACY_API_DISABLED" })
  },
})
