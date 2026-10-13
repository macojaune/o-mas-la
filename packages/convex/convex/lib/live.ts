import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"
import type { EndReason, SessionView } from "../../src/contracts"
import { fail } from "./security"

export function sessionView(
  session: Doc<"liveSessions">,
  accountId: Id<"accounts">,
): SessionView {
  return {
    id: session._id,
    groupId: session.groupId,
    status: session.status,
    deviceId: session.deviceId,
    generation: session.generation,
    startedAt: session.startedAt,
    expiresAt: session.expiresAt,
    emitterAccountId: session.emitterAccountId,
    isEmitter: session.emitterAccountId === accountId,
    ...(session.endedAt !== undefined ? { endedAt: session.endedAt } : {}),
    ...(session.endReason ? { endReason: session.endReason } : {}),
    ...(session.handoffToAccountId
      ? { handoffToAccountId: session.handoffToAccountId }
      : {}),
    ...(session.speedWarningAt !== undefined
      ? { speedWarningAt: session.speedWarningAt }
      : {}),
  }
}
export async function endSession(
  ctx: MutationCtx,
  session: Doc<"liveSessions">,
  reason: EndReason,
  actorId?: Id<"accounts">,
) {
  if (session.status === "ended") return session
  const now = Date.now()
  await ctx.db.patch(session._id, {
    status: "ended",
    endedAt: now,
    endReason: reason,
    ...(actorId ? { endedBy: actorId } : {}),
    handoffToAccountId: undefined,
  })
  const group = await ctx.db.get(session.groupId)
  if (group?.activeSessionId === session._id)
    await ctx.db.patch(group._id, { activeSessionId: undefined, isLive: false })
  await ctx.db.insert("operationEvents", {
    sessionId: session._id,
    groupId: session.groupId,
    type: "ended",
    occurredAt: now,
    reason,
    ...(actorId ? { actorId } : {}),
  })
  return {
    ...session,
    status: "ended" as const,
    endedAt: now,
    endReason: reason,
    ...(actorId ? { endedBy: actorId } : {}),
    handoffToAccountId: undefined,
  }
}
export function requireEmitter(
  session: Doc<"liveSessions">,
  accountId: Id<"accounts">,
  deviceId: string,
  generation: number,
  sid: string,
) {
  if (
    session.emitterAccountId !== accountId ||
    session.deviceId !== deviceId ||
    session.generation !== generation ||
    session.emitterAuthSessionId !== sid
  )
    return fail("EMITTER_REVOKED")
}
export async function currentLive(ctx: MutationCtx, group: Doc<"groups">) {
  if (!group.activeSessionId) return null
  const session = await ctx.db.get(group.activeSessionId)
  if (!session || session.status === "ended") return null
  if (session.expiresAt <= Date.now()) {
    await endSession(ctx, session, "duration")
    return null
  }
  return session
}
