import { NextResponse } from "next/server"

import { publicJwks } from "@oyo/auth/tokens"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json(await publicJwks(), {
    headers: { "Cache-Control": "public, max-age=60" },
  })
}
