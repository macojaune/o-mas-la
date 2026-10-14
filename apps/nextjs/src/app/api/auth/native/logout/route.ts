import type { NextRequest} from "next/server"
import { NextResponse } from "next/server"

import { invalidateSessionToken } from "@oyo/auth"
import { bearerSession } from "@oyo/auth/native"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const authorization = req.headers.get("authorization")
  if (!authorization || !bearerSession(authorization))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  await invalidateSessionToken(authorization)
  return NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } },
  )
}
