import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import {
  handlers,
  invalidateSessionToken,
  isSecureContext,
  validateToken,
} from "@oyo/auth"
import { env } from "@oyo/auth/env"
import {
  completeNativeGrant,
  createNativeGrant,
  NATIVE_COOKIE_NAME,
  NATIVE_FLOW_SECONDS,
  sessionCookieValue,
} from "@oyo/auth/native"
import { sessionId } from "@oyo/auth/tokens"

export const runtime = "nodejs"

export const POST = async (req: NextRequest) => {
  if (req.nextUrl.pathname === "/api/auth/signout") {
    const form = req.headers
      .get("content-type")
      ?.startsWith("application/x-www-form-urlencoded")
      ? new URLSearchParams(await req.clone().text())
      : null
    const csrfCookie =
      req.cookies.get("__Host-authjs.csrf-token")?.value ??
      req.cookies.get("authjs.csrf-token")?.value
    const [csrf, signedHash] = csrfCookie?.split("|") ?? []
    // Verify Auth.js' signed double-submit token before the pre-revocation.
    if (
      req.headers.get("origin") !== env.AUTH_ISSUER_URL ||
      !env.AUTH_SECRET ||
      !csrf ||
      form?.get("csrfToken") !== csrf ||
      (await sessionId(`${csrf}${env.AUTH_SECRET}`)) !== signedHash
    ) {
      return NextResponse.json(
        { error: "invalid_signout_request" },
        { status: 403 },
      )
    }
    const token =
      req.cookies.get("__Secure-authjs.session-token")?.value ??
      req.cookies.get("authjs.session-token")?.value
    try {
      if (token && (await validateToken(`Bearer ${token}`)))
        await invalidateSessionToken(`Bearer ${token}`)
    } catch {
      // Auth.js itself swallows adapter signout failures and clears its cookie.
      // Do not call it until revocation succeeds, so a failed logout can be retried.
      return NextResponse.json(
        { error: "logout_unavailable" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      )
    }
  }
  return handlers.POST(req)
}

export const GET = async (
  req: NextRequest,
  props: { params: Promise<{ nextauth: string[] }> },
) => {
  const action = (await props.params).nextauth[0]
  const search = req.nextUrl.searchParams
  // The former arbitrary redirect + session_token URL bridge is closed.
  if (search.has("expo-redirect")) {
    return NextResponse.json(
      { error: "unsupported_native_flow" },
      { status: 400 },
    )
  }

  if (action === "signin" && search.has("native_redirect")) {
    const grant = await createNativeGrant(
      search.get("native_redirect"),
      search.get("code_challenge"),
      search.get("state"),
    )
    if (!grant)
      return NextResponse.json(
        { error: "invalid_native_request" },
        { status: 400 },
      )
    const response = await handlers.GET(req)
    response.headers.append(
      "Set-Cookie",
      `${NATIVE_COOKIE_NAME}=${grant.id}; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=${NATIVE_FLOW_SECONDS}${isSecureContext ? "; Secure" : ""}`,
    )
    response.headers.set("Cache-Control", "no-store")
    return response
  }

  const nativeCookie = req.cookies.get(NATIVE_COOKIE_NAME)
  if (action === "callback" && nativeCookie) {
    const authResponse = await handlers.GET(req)
    const sessionToken = sessionCookieValue(authResponse.headers.getSetCookie())
    const location = authResponse.headers.get("location")
    const providerFailed =
      authResponse.status < 300 ||
      authResponse.status >= 400 ||
      !location ||
      new URL(location, req.url).searchParams.has("error")
    const grant =
      !providerFailed && sessionToken
        ? await completeNativeGrant(nativeCookie.value, sessionToken)
        : null
    if (!grant) {
      const response = NextResponse.json(
        { error: "native_auth_failed" },
        { status: 401 },
      )
      response.cookies.set(NATIVE_COOKIE_NAME, "", {
        path: "/api/auth",
        maxAge: 0,
        httpOnly: true,
        secure: isSecureContext,
        sameSite: "lax",
      })
      return response
    }
    const url = new URL(grant.redirectUri)
    url.searchParams.set("code", grant.id)
    url.searchParams.set("state", grant.clientState)
    const response = NextResponse.redirect(url)
    for (const cookie of authResponse.headers.getSetCookie())
      response.headers.append("Set-Cookie", cookie)
    response.cookies.set(NATIVE_COOKIE_NAME, "", {
      path: "/api/auth",
      maxAge: 0,
      httpOnly: true,
      secure: isSecureContext,
      sameSite: "lax",
    })
    response.headers.set("Cache-Control", "no-store")
    response.headers.set("Referrer-Policy", "no-referrer")
    return response
  }

  return handlers.GET(req)
}
