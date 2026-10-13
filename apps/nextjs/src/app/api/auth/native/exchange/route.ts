import type { NextRequest} from "next/server"
import { NextResponse } from "next/server"
import { z } from "zod"

import { exchangeNativeGrant } from "@oyo/auth/native"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const body = z
    .object({ code: z.string(), verifier: z.string() })
    .strict()
    .safeParse(await req.json().catch(() => null))
  if (!body.success)
    return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  const result = await exchangeNativeGrant(body.data.code, body.data.verifier)
  return NextResponse.json(result ?? { error: "invalid_grant" }, {
    status: result ? 200 : 401,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  })
}
