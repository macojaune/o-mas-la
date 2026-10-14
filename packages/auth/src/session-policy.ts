import { bearerSession } from "./native-protocol"

export async function verifiedSession<
  T extends { session: { expires: Date }; user: { id: string } },
>(
  authorization: string,
  lookup: (token: string) => Promise<T | null | undefined>,
  now = Date.now(),
) {
  const token = bearerSession(authorization)
  if (!token) return null
  const result = await lookup(token)
  if (
    !result ||
    !Number.isFinite(result.session.expires.getTime()) ||
    result.session.expires.getTime() <= now
  )
    return null
  return result
}
