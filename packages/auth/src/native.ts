import { and, eq, gt, isNotNull, isNull, lt } from "@oyo/db"
import { db } from "@oyo/db/client"
import { NativeAuthGrant } from "@oyo/db/schema"

import { validateToken } from "./config"
import {
  NATIVE_CODE_SECONDS,
  NATIVE_FLOW_SECONDS,
  proofChallenge,
  randomCode,
  validClientState,
  validNativeRedirect,
  validProofChallenge,
  validVerifier,
} from "./native-protocol"

export * from "./native-protocol"

export async function pendingNativeGrantId(id: string | undefined) {
  if (!id || !validProofChallenge(id)) return undefined
  const grant = await db
    .select({ id: NativeAuthGrant.id })
    .from(NativeAuthGrant)
    .where(
      and(
        eq(NativeAuthGrant.id, id),
        gt(NativeAuthGrant.expires, new Date()),
        isNull(NativeAuthGrant.sessionToken),
      ),
    )
    .get()
  return grant?.id
}

export async function createNativeGrant(
  redirectUri: unknown,
  codeChallenge: unknown,
  clientState: unknown,
) {
  if (
    !validNativeRedirect(redirectUri) ||
    !validProofChallenge(codeChallenge) ||
    !validClientState(clientState)
  )
    return null
  const now = new Date()
  // Opportunistic cleanup; expired grants are refused even before their deletion.
  await db.delete(NativeAuthGrant).where(lt(NativeAuthGrant.expires, now))
  const grant = {
    id: randomCode(),
    redirectUri,
    codeChallenge,
    clientState,
    expires: new Date(now.getTime() + NATIVE_FLOW_SECONDS * 1000),
  }
  await db.insert(NativeAuthGrant).values(grant)
  return grant
}

export async function completeNativeGrant(id: string, sessionToken: string) {
  if (!validProofChallenge(id)) return null
  const session = await validateToken(`Bearer ${sessionToken}`)
  if (!session) return null
  const result = await db
    .update(NativeAuthGrant)
    .set({
      sessionToken,
      expires: new Date(
        Math.min(
          Date.now() + NATIVE_CODE_SECONDS * 1000,
          new Date(session.expires).getTime(),
        ),
      ),
    })
    .where(
      and(
        eq(NativeAuthGrant.id, id),
        gt(NativeAuthGrant.expires, new Date()),
        isNull(NativeAuthGrant.sessionToken),
      ),
    )
    .returning()
  const grant = result[0]
  return grant && validNativeRedirect(grant.redirectUri) ? grant : null
}

export async function exchangeNativeGrant(code: unknown, verifier: unknown) {
  if (!validProofChallenge(code) || !validVerifier(verifier)) return null
  // DELETE ... RETURNING is atomic: concurrent exchanges cannot both succeed.
  const result = await db
    .delete(NativeAuthGrant)
    .where(
      and(
        eq(NativeAuthGrant.id, code),
        eq(NativeAuthGrant.codeChallenge, await proofChallenge(verifier)),
        gt(NativeAuthGrant.expires, new Date()),
        isNotNull(NativeAuthGrant.sessionToken),
      ),
    )
    .returning()
  const token = result[0]?.sessionToken
  if (!token) return null
  const session = await validateToken(`Bearer ${token}`)
  if (!session) return null
  return {
    sessionToken: token,
    user: { id: session.user.id, name: session.user.name ?? null },
    expires: session.expires,
  }
}
