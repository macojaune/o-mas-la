import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { NextRequest } from "next/server"
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import type { db as AuthDatabase } from "@oyo/db/client"
import { sql } from "@oyo/db"

import type * as Routes from "../../../apps/nextjs/src/app/api/auth/[...nextauth]/route"
import type * as Config from "./config"
import type * as Email from "./email"
import type * as Native from "./native"

let directory: string
let db: typeof AuthDatabase
let routes: typeof Routes
let native: typeof Native
let config: typeof Config
let email: typeof Email
const origin = "https://auth.example.invalid"
const delivery = vi.fn()

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "omasla-email-test-"))
  vi.stubEnv("DB_URL", `file:${join(directory, "auth.sqlite")}`)
  vi.stubEnv("NODE_ENV", "production")
  vi.stubEnv("AUTH_SECRET", "fixture-email-secret-with-at-least-32-characters")
  vi.stubEnv("AUTH_ISSUER_URL", origin)
  vi.stubEnv("AUTH_URL", origin)
  vi.stubEnv("AUTH_GOOGLE_ID", "fixture-google-id")
  vi.stubEnv("AUTH_GOOGLE_SECRET", "fixture-google-secret")
  vi.stubEnv("AUTH_APPLE_ID", "fixture-apple-id")
  vi.stubEnv("AUTH_APPLE_SECRET", "fixture-apple-secret")
  vi.stubEnv("AUTH_BREVO_API_KEY", "fixture-brevo-key-never-sent")
  vi.stubEnv("AUTH_EMAIL_FROM", "login@example.invalid")
  db = (await import("@oyo/db/client")).db
  for (const name of [
    "0000_majestic_surge",
    "0001_native_auth_grant",
    "0002_email_auth",
  ]) {
    const migration = await readFile(
      new URL(`../../db/drizzle/${name}.sql`, import.meta.url),
      "utf8",
    )
    for (const statement of migration.split("--> statement-breakpoint"))
      await db.run(sql.raw(statement))
  }
  routes = await import(
    "../../../apps/nextjs/src/app/api/auth/[...nextauth]/route"
  )
  native = await import("./native")
  config = await import("./config")
  email = await import("./email")
})
beforeEach(async () => {
  vi.restoreAllMocks()
  delivery
    .mockReset()
    .mockResolvedValue(
      Response.json({ messageId: "simulated-no-email-sent" }, { status: 201 }),
    )
  vi.stubGlobal("fetch", delivery)
  for (const table of [
    "verification_token",
    "auth_email_limit",
    "native_auth_grant",
    "session",
    "account",
    "user",
  ])
    await db.run(sql.raw(`DELETE FROM ${table}`))
})
afterAll(async () => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  await rm(directory, { recursive: true, force: true })
})

function get(url: string, cookie = "") {
  const request = new NextRequest(url, {
    headers: cookie ? { Cookie: cookie } : {},
  })
  return routes.GET(request, {
    params: Promise.resolve({
      nextauth: new URL(url).pathname.replace("/api/auth/", "").split("/"),
    }),
  })
}
function cookies(response: Response) {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ")
}
async function requestLink(
  address = "spectator@example.invalid",
  extraCookie = "",
) {
  const csrf = await get(`${origin}/api/auth/csrf`)
  const { csrfToken } = (await csrf.json()) as { csrfToken: string }
  return routes.POST(
    new NextRequest(`${origin}/api/auth/signin/email`, {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: [cookies(csrf), extraCookie].filter(Boolean).join("; "),
      },
      body: new URLSearchParams({
        csrfToken,
        email: address,
        callbackUrl: `${origin}/map?declaration=1`,
      }),
    }),
  )
}
function deliveredLink() {
  const [url, options] = delivery.mock.calls[0] as [string, RequestInit]
  expect(url).toBe("https://api.brevo.com/v3/smtp/email")
  const body = JSON.parse(options.body as string) as {
    textContent: string
    to: { email: string }[]
  }
  expect(body.to[0]?.email).toBe("spectator@example.invalid")
  const link = /https:\/\/\S+/.exec(body.textContent)?.[0]
  if (!link) throw new Error("No simulated link")
  return link
}

describe("real Auth.js email flow with simulated Brevo transport", () => {
  it("pins production provider URLs to AUTH_URL despite forged request and forwarded hosts", async () => {
    const response = await routes.GET(
      new NextRequest("https://evil.example/api/auth/providers", {
        headers: {
          Host: "evil.example",
          "X-Forwarded-Host": "evil.example",
          "X-Forwarded-Proto": "http",
        },
      }),
      { params: Promise.resolve({ nextauth: ["providers"] }) },
    )
    expect(response.status).toBe(200)
    const providers = (await response.json()) as Record<
      string,
      { signinUrl: string; callbackUrl: string }
    >
    for (const provider of Object.values(providers)) {
      expect(new URL(provider.signinUrl).origin).toBe(origin)
      expect(new URL(provider.callbackUrl).origin).toBe(origin)
    }
    const start = await get(
      `${origin}/api/auth/signin?native_redirect=omasla%3A%2F%2Flogin&code_challenge=${"c".repeat(43)}&state=${"s".repeat(48)}`,
    )
    const nativeCookie = start.headers
      .getSetCookie()
      .find((cookie) => cookie.startsWith("omasla-native-auth="))
    expect(nativeCookie).toContain("HttpOnly")
    expect(nativeCookie).toContain("SameSite=None; Secure")
  })
  it("exposes Google, Apple and email only and requires verified OIDC emails", async () => {
    const response = await get(`${origin}/api/auth/providers`)
    expect(
      Object.keys((await response.json()) as Record<string, unknown>),
    ).toEqual(["google", "apple", "email"])
    const callback = config.authConfig.callbacks.signIn
    expect(
      await callback({
        account: { provider: "google" },
        profile: { email_verified: false },
      } as Parameters<typeof callback>[0]),
    ).toBe(false)
    expect(
      await callback({
        account: { provider: "apple" },
        profile: { email_verified: "true" },
      } as unknown as Parameters<typeof callback>[0]),
    ).toBe(true)
    for (const provider of config.authConfig.providers)
      expect(provider).not.toHaveProperty(
        "allowDangerousEmailAccountLinking",
        true,
      )
  })
  it("stores only a hash, expires in 15 minutes, signs in once and refuses replay", async () => {
    const response = await requestLink()
    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toContain("verify-request")
    const link = deliveredLink()
    const token = new URL(link).searchParams.get("token")
    const stored = await db.get<{ token: string; expires: number }>(
      sql`SELECT token, expires FROM verification_token`,
    )
    expect(stored.token).not.toBe(token)
    expect(stored.expires).toBeGreaterThan(Date.now() / 1000 + 14 * 60)
    const callback = await get(link)
    expect(callback.status).toBe(302)
    expect(callback.headers.get("location")).toBe(`${origin}/map?declaration=1`)
    expect(cookies(callback)).toContain("authjs.session-token")
    expect(await db.all(sql`SELECT * FROM verification_token`)).toHaveLength(0)
    const replay = await get(link)
    expect(replay.headers.get("location")).toContain("error=Verification")
    expect(cookies(replay)).not.toContain("authjs.session-token")
  })
  it("rejects an expired link and simultaneous reuse", async () => {
    await requestLink()
    const link = deliveredLink()
    await db.run(sql`UPDATE verification_token SET expires = 1`)
    expect((await get(link)).headers.get("location")).toContain(
      "error=Verification",
    )
    await db.run(sql`DELETE FROM auth_email_limit`)
    delivery.mockClear()
    await requestLink()
    const next = deliveredLink()
    const responses = await Promise.all([get(next), get(next)])
    expect(
      responses.filter((response) =>
        cookies(response).includes("authjs.session-token"),
      ),
    ).toHaveLength(1)
  })
  it("returns a native email link through its original PKCE grant from a different browser", async () => {
    const verifier = "fixture-native-email-verifier-12345678901234567890123"
    const state = "fixture-native-email-state-12345678901234567890"
    const grant = await native.createNativeGrant(
      "omasla://login",
      await native.proofChallenge(verifier),
      state,
    )
    if (!grant) throw new Error("No grant")
    await requestLink(
      "spectator@example.invalid",
      `omasla-native-auth=${grant.id}`,
    )
    const link = deliveredLink()
    const result = await get(link) // Deliberately no cookies: external mail browser.
    const target = new URL(result.headers.get("location") ?? "")
    expect(`${target.protocol}//${target.host}`).toBe("omasla://login")
    expect(target.searchParams.get("code")).toBe(grant.id)
    expect(target.searchParams.get("state")).toBe(state)
    expect(target.searchParams.has("session_token")).toBe(false)
    expect(
      await native.exchangeNativeGrant(
        grant.id,
        "wrong-verifier-123456789012345678901234567890123",
      ),
    ).toBeNull()
    expect(
      (await native.exchangeNativeGrant(grant.id, verifier))?.user.id,
    ).toBeTruthy()
    expect(await native.exchangeNativeGrant(grant.id, verifier)).toBeNull()
  })
  it("rejects CSRF and foreign origin before sending or storing a token", async () => {
    for (const requestOrigin of [origin, "https://evil.example"]) {
      const response = await routes.POST(
        new NextRequest(`${origin}/api/auth/signin/email`, {
          method: "POST",
          headers: {
            Origin: requestOrigin,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "email=spectator%40example.invalid&csrfToken=wrong",
        }),
      )
      expect([302, 403]).toContain(response.status)
    }
    expect(delivery).not.toHaveBeenCalled()
    expect(await db.all(sql`SELECT * FROM verification_token`)).toHaveLength(0)
  })
  it("limits requests before token creation and reports transport failure without false success", async () => {
    await requestLink()
    const blocked = await requestLink()
    expect(blocked.headers.get("location")).toContain("error=AccessDenied")
    expect(delivery).toHaveBeenCalledTimes(1)
    expect(await db.all(sql`SELECT * FROM verification_token`)).toHaveLength(1)
    await db.run(sql`DELETE FROM auth_email_limit`)
    delivery.mockResolvedValueOnce(
      new Response("fixture provider rejection", { status: 503 }),
    )
    const failed = await requestLink("other@example.invalid")
    expect(failed.headers.get("location")).toContain("error=Configuration")
  })
  it("normalizes addresses strictly and enforces database email uniqueness", async () => {
    expect(email.normalizeEmail("  Spectator@EXAMPLE.invalid ")).toBe(
      "spectator@example.invalid",
    )
    for (const value of [
      "victim@example.invalid,other@example.invalid",
      "a@@example.invalid",
      "a\r\n@example.invalid",
    ])
      expect(() => email.normalizeEmail(value)).toThrow()
    await db.run(
      sql`INSERT INTO user (id,email) VALUES ('one','Same@example.invalid')`,
    )
    await expect(
      db.run(
        sql`INSERT INTO user (id,email) VALUES ('two','same@example.invalid')`,
      ),
    ).rejects.toThrow()
  })
})
