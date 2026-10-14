import type { TRPCRouterRecord } from "@trpc/server"
import { TRPCError } from "@trpc/server"

import { protectedProcedure } from "../trpc"

// Operational notifications belong to an authorized live session. The legacy
// endpoint accepted any recipient and message, so it must no longer send.
export const notificationRouter = {
  send: protectedProcedure.mutation(() => {
    throw new TRPCError({ code: "FORBIDDEN", message: "LEGACY_API_DISABLED" })
  }),
} satisfies TRPCRouterRecord
