import type { NextRequest} from "next/server"
import { NextResponse } from "next/server"

import { validateToken } from "@oyo/auth"
import { env } from "@oyo/auth/env"
import { bearerSession } from "@oyo/auth/native"
import { issueAccessToken } from "@oyo/auth/tokens"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const authorization = req.headers.get("authorization")
  let token = bearerSession(authorization)
  if (!authorization) {
    const origin = req.headers.get("origin")
    if (
      !origin ||
      origin !== env.AUTH_ISSUER_URL ||
      req.headers.get("content-type") !== "application/json"
    ) {
      return NextResponse.json({ error: "invalid_origin" }, { status: 403 })
    }
    token =
      req.cookies.get("__Secure-authjs.session-token")?.value ??
      req.cookies.get("authjs.session-token")?.value ??
      null
  }
  const session = token ? await validateToken(`Bearer ${token}`) : null
  if (!token || !session)
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    )
  const access = await issueAccessToken(session, token)
  return NextResponse.json(
    {
      ...access,
      user: { id: session.user.id, name: session.user.name ?? null },
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}
