import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { NextRequest } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import {
  createLocalJWKSet,
  exportPKCS8,
  generateKeyPair,
  jwtVerify,
} from "jose"
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

import type * as CallbackModule from "../../../apps/nextjs/src/app/api/auth/[...nextauth]/route"
import type * as TokenRouteModule from "../../../apps/nextjs/src/app/api/auth/convex-token/route"
import type * as ExchangeModule from "../../../apps/nextjs/src/app/api/auth/native/exchange/route"
import type * as AuthModule from "./config"
import type * as NativeModule from "./native"
import type * as TokenModule from "./tokens"
import {
  bearerSession,
  proofChallenge,
  sessionCookieValue,
  validNativeRedirect,
} from "./native-protocol"
import { verifiedSession } from "./session-policy"

const provider = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock("@oyo/auth", async () => {
  const config = await import("./config")
  return { ...config, handlers: { GET: provider.get, POST: provider.post } }
})

let fixtureDirectory: string
let db: typeof AuthDatabase
let native: typeof NativeModule
let tokens: typeof TokenModule
let auth: typeof AuthModule
let callback: typeof CallbackModule
let exchange: typeof ExchangeModule
let tokenRoute: typeof TokenRouteModule
const sessionToken = "fixture-session-token-12345678901234567890"
const verifier = "fixture-pkce-verifier-with-at-least-forty-three-characters"
const clientState = "fixture-native-state-12345678901234567890"

beforeAll(async () => {
  fixtureDirectory = await mkdtemp(join(tmpdir(), "omasla-auth-test-"))
  vi.stubEnv("DB_URL", `file:${join(fixtureDirectory, "auth.sqlite")}`)
  vi.stubEnv("NODE_ENV", "development")
  vi.stubEnv("AUTH_DISCORD_ID", "fixture-discord-id")
  vi.stubEnv("AUTH_DISCORD_SECRET", "fixture-discord-secret")
  vi.stubEnv("AUTH_SECRET", "fixture-auth-secret-at-least-32-characters")
  vi.stubEnv("AUTH_ISSUER_URL", "http://localhost:3000")
  vi.stubEnv("AUTH_JWT_KEY_ID", "fixture-key")
  vi.stubEnv("CONVEX_URL", "https://fixture.convex.cloud")
  const { privateKey } = await generateKeyPair("RS256", { extractable: true })
  vi.stubEnv("AUTH_JWT_PRIVATE_KEY", await exportPKCS8(privateKey))
  db = (await import("@oyo/db/client")).db
  const migration = await readFile(
    new URL("../../db/drizzle/0000_majestic_surge.sql", import.meta.url),
    "utf8",
  )
  for (const statement of migration.split("--> statement-breakpoint"))
    await db.run(sql.raw(statement))
  const nativeMigration = await readFile(
    new URL("../../db/drizzle/0001_native_auth_grant.sql", import.meta.url),
    "utf8",
  )
  for (const statement of nativeMigration.split("--> statement-breakpoint"))
    await db.run(sql.raw(statement))
  native = await import("./native")
  tokens = await import("./tokens")
  auth = await import("./config")
  callback = await import(
    "../../../apps/nextjs/src/app/api/auth/[...nextauth]/route"
  )
  exchange = await import(
    "../../../apps/nextjs/src/app/api/auth/native/exchange/route"
  )
  tokenRoute = await import(
    "../../../apps/nextjs/src/app/api/auth/convex-token/route"
  )
})

beforeEach(async () => {
  vi.restoreAllMocks()
  provider.get.mockReset()
  provider.post.mockReset()
  await db.run(sql`DELETE FROM native_auth_grant`)
  await db.run(sql`DELETE FROM session`)
  await db.run(sql`DELETE FROM user`)
  await db.run(
    sql`INSERT INTO user (id, name, email) VALUES ('account-fixture', 'Spectateur fixture', 'fixture@example.invalid')`,
  )
  await db.run(
    sql`INSERT INTO session (sessionToken, userId, expires) VALUES (${sessionToken}, 'account-fixture', ${Math.floor(Date.now() / 1000) + 3600})`,
  )
})

afterAll(async () => {
  vi.unstubAllEnvs()
  await rm(fixtureDirectory, { recursive: true, force: true })
})

async function grant() {
  const result = await native.createNativeGrant(
    "omasla://login",
    await proofChallenge(verifier),
    clientState,
  )
  if (!result) throw new Error("Fixture grant failed")
  return result
}

function callbackRequest(cookie?: string) {
  return new NextRequest(
    "http://localhost:3000/api/auth/callback/discord?code=fixture-provider-code",
    { headers: cookie ? { Cookie: `omasla-native-auth=${cookie}` } : {} },
  )
}

function providerSuccess() {
  provider.get.mockResolvedValue(
    new Response(null, {
      status: 302,
      headers: {
        Location: "http://localhost:3000/",
        "Set-Cookie": `authjs.session-token=${sessionToken}; HttpOnly; Path=/`,
      },
    }),
  )
}

describe("strict native protocol", () => {
  it("allows only the exact application callback", () => {
    expect(validNativeRedirect("omasla://login")).toBe(true)
    for (const url of [
      "https://evil.example",
      "expo://login",
      "omasla://evil",
      "omasla://login.evil",
      "omasla://login@evil",
      "omasla://login/path",
      "omasla://login?x=y",
      "omasla://login#fragment",
      "omasla://%6cogin",
    ])
      expect(validNativeRedirect(url)).toBe(false)
  })
  it("refuses malformed and expired session authorization before private access", async () => {
    const lookup = vi.fn().mockResolvedValue({
      user: { id: "user" },
      session: { expires: new Date(1000) },
    })
    expect(bearerSession(`Basic ${sessionToken}`)).toBeNull()
    expect(await verifiedSession(`Basic ${sessionToken}`, lookup)).toBeNull()
    expect(lookup).not.toHaveBeenCalled()
    expect(
      await verifiedSession(`Bearer ${sessionToken}`, lookup, 1000),
    ).toBeNull()
    expect(
      await verifiedSession(`Bearer ${sessionToken}`, lookup, 999),
    ).not.toBeNull()
  })
  it("only extracts an actual Auth.js session cookie", () => {
    expect(sessionCookieValue([`unrelated=${sessionToken}; Path=/`])).toBeNull()
    expect(
      sessionCookieValue([
        `__Secure-authjs.session-token=${sessionToken}; Path=/`,
      ]),
    ).toBe(sessionToken)
  })
})

describe("PKCE database handoff", () => {
  it("returns no session before the OAuth callback completed", async () => {
    const pending = await grant()
    expect(await native.exchangeNativeGrant(pending.id, verifier)).toBeNull()
  })
  it("refuses wrong proof without consuming the legitimate grant, then prevents concurrent replay", async () => {
    const pending = await grant()
    await native.completeNativeGrant(pending.id, sessionToken)
    expect(
      await native.exchangeNativeGrant(pending.id, "x".repeat(64)),
    ).toBeNull()
    const results = await Promise.all([
      native.exchangeNativeGrant(pending.id, verifier),
      native.exchangeNativeGrant(pending.id, verifier),
    ])
    expect(results.filter(Boolean)).toHaveLength(1)
    expect(results.find(Boolean)?.sessionToken).toBe(sessionToken)
  })
  it("refuses expired codes and expired database sessions", async () => {
    const pending = await grant()
    await native.completeNativeGrant(pending.id, sessionToken)
    await db.run(sql`UPDATE native_auth_grant SET expires = 1`)
    expect(await native.exchangeNativeGrant(pending.id, verifier)).toBeNull()
    await db.run(sql`UPDATE session SET expires = 1`)
    expect(await auth.validateToken(`Bearer ${sessionToken}`)).toBeNull()
  })
  it("serves an exchange without credentials in its URL and with no-store", async () => {
    const pending = await grant()
    await native.completeNativeGrant(pending.id, sessionToken)
    const response = await exchange.POST(
      new NextRequest("http://localhost:3000/api/auth/native/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: pending.id, verifier }),
      }),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    expect(await response.json()).toMatchObject({
      user: { id: "account-fixture" },
    })
  })
})

describe("OAuth route boundary", () => {
  it("closes the legacy arbitrary-return bridge", async () => {
    const response = await callback.GET(
      new NextRequest(
        "http://localhost:3000/api/auth/signin?expo-redirect=https://evil.example",
      ),
      { params: Promise.resolve({ nextauth: ["signin"] }) },
    )
    expect(response.status).toBe(400)
    expect(provider.get).not.toHaveBeenCalled()
  })
  it("rejects malicious native targets before touching OAuth", async () => {
    const response = await callback.GET(
      new NextRequest(
        "http://localhost:3000/api/auth/signin?native_redirect=https://evil.example",
      ),
      { params: Promise.resolve({ nextauth: ["signin"] }) },
    )
    expect(response.status).toBe(400)
    expect(provider.get).not.toHaveBeenCalled()
  })
  it("returns a one-time code with state, never the long session token", async () => {
    const pending = await grant()
    providerSuccess()
    const response = await callback.GET(callbackRequest(pending.id), {
      params: Promise.resolve({ nextauth: ["callback", "discord"] }),
    })
    const target = new URL(
      response.headers.get("Location") ?? "https://invalid.example",
    )
    expect(target.protocol).toBe("omasla:")
    expect(target.host).toBe("login")
    expect(target.searchParams.get("state")).toBe(clientState)
    expect(target.searchParams.get("code")).toBe(pending.id)
    expect(target.toString()).not.toContain(sessionToken)
    expect(target.searchParams.has("session_token")).toBe(false)
  })
  it("refuses an altered cookie and a provider error without leaking session contents", async () => {
    providerSuccess()
    const altered = await callback.GET(callbackRequest("x".repeat(43)), {
      params: Promise.resolve({ nextauth: ["callback", "discord"] }),
    })
    expect(altered.status).toBe(401)
    expect(await altered.text()).not.toContain(sessionToken)
    const pending = await grant()
    provider.get.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: {
          Location: "http://localhost:3000/api/auth/error?error=AccessDenied",
        },
      }),
    )
    const denied = await callback.GET(callbackRequest(pending.id), {
      params: Promise.resolve({ nextauth: ["callback", "discord"] }),
    })
    expect(denied.status).toBe(401)
    expect(await native.exchangeNativeGrant(pending.id, verifier)).toBeNull()
  })
  it("without a native cookie follows only the normal web response", async () => {
    providerSuccess()
    const response = await callback.GET(callbackRequest(), {
      params: Promise.resolve({ nextauth: ["callback", "discord"] }),
    })
    expect(response.headers.get("Location")).toBe("http://localhost:3000/")
  })
})

describe("signed Convex identity", () => {
  it("signs the verified account with audience/issuer/expiry and publishes no private key material", async () => {
    const response = await tokenRoute.POST(
      new NextRequest("http://localhost:3000/api/auth/convex-token", {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}` },
      }),
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as { token: string }
    const jwks = await tokens.publicJwks()
    expect(Object.keys(jwks.keys[0] ?? {}).sort()).toEqual([
      "alg",
      "e",
      "kid",
      "kty",
      "n",
      "use",
    ])
    const verifyKey = createLocalJWKSet(jwks)
    const result = await jwtVerify(body.token, verifyKey, {
      issuer: "http://localhost:3000",
      audience: "omasla-convex",
      algorithms: ["RS256"],
    })
    expect(result.payload.sub).toBe("account-fixture")
    expect(result.payload.sid).toBe(await tokens.sessionId(sessionToken))
    expect(
      Number(result.payload.exp) - Number(result.payload.iat),
    ).toBeLessThanOrEqual(60)
    expect(result.payload).not.toHaveProperty("email")
    await expect(
      jwtVerify(body.token, verifyKey, { audience: "another-app" }),
    ).rejects.toThrow()
    await expect(
      jwtVerify(body.token, verifyKey, {
        currentDate: new Date(Date.now() + 61_000),
      }),
    ).rejects.toThrow()
  })
  it("refuses absent/unknown bearer and cross-origin cookie requests", async () => {
    const absent = await tokenRoute.POST(
      new NextRequest("http://localhost:3000/api/auth/convex-token", {
        method: "POST",
      }),
    )
    expect(absent.status).toBe(403)
    const invalid = await tokenRoute.POST(
      new NextRequest("http://localhost:3000/api/auth/convex-token", {
        method: "POST",
        headers: {
          Authorization: "Bearer unknown-session-12345678901234567890",
        },
      }),
    )
    expect(invalid.status).toBe(401)
    const foreign = await tokenRoute.POST(
      new NextRequest("http://localhost:3000/api/auth/convex-token", {
        method: "POST",
        headers: {
          Origin: "https://evil.example",
          Cookie: `authjs.session-token=${sessionToken}`,
          "Content-Type": "application/json",
        },
      }),
    )
    expect(foreign.status).toBe(403)
  })
  it("revokes the backend identity before deleting the database session", async () => {
    const revoke = vi
      .spyOn(ConvexHttpClient.prototype, "mutation")
      .mockRejectedValueOnce(new Error("offline"))
    await expect(
      auth.invalidateSessionToken(`Bearer ${sessionToken}`),
    ).rejects.toThrow("offline")
    expect(await auth.validateToken(`Bearer ${sessionToken}`)).not.toBeNull()
    revoke.mockResolvedValueOnce({ revoked: true })
    await auth.invalidateSessionToken(`Bearer ${sessionToken}`)
    expect(revoke).toHaveBeenCalledTimes(2)
    expect(await auth.validateToken(`Bearer ${sessionToken}`)).toBeNull()
  })
})

describe("web signout failure and retry", () => {
  async function request(validCsrf = true, origin = "http://localhost:3000") {
    const csrf = "fixture-csrf-token"
    const signed = await tokens.sessionId(
      `${csrf}fixture-auth-secret-at-least-32-characters`,
    )
    return new NextRequest("http://localhost:3000/api/auth/signout", {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: `authjs.session-token=${sessionToken}; authjs.csrf-token=${encodeURIComponent(`${csrf}|${signed}`)}`,
      },
      body: new URLSearchParams({
        csrfToken: validCsrf ? csrf : "wrong",
        callbackUrl: "/map",
      }),
    })
  }

  it("preserves the cookie and server session during Convex failure, then permits a successful retry", async () => {
    const revoke = vi
      .spyOn(ConvexHttpClient.prototype, "mutation")
      .mockRejectedValueOnce(new Error("offline"))
    const failed = await callback.POST(await request())
    expect(failed.status).toBe(503)
    expect(failed.headers.has("Set-Cookie")).toBe(false)
    expect(provider.post).not.toHaveBeenCalled()
    expect(await auth.validateToken(`Bearer ${sessionToken}`)).not.toBeNull()
    revoke.mockResolvedValueOnce({ revoked: true })
    provider.post.mockResolvedValueOnce(
      new Response(JSON.stringify({ url: "/map" }), {
        headers: { "Set-Cookie": "authjs.session-token=; Max-Age=0; Path=/" },
      }),
    )
    const retry = await callback.POST(await request())
    expect(retry.status).toBe(200)
    expect(provider.post).toHaveBeenCalledTimes(1)
    expect(await auth.validateToken(`Bearer ${sessionToken}`)).toBeNull()
  })

  it("rejects wrong CSRF or foreign origin before revoking anything", async () => {
    const revoke = vi.spyOn(ConvexHttpClient.prototype, "mutation")
    expect((await callback.POST(await request(false))).status).toBe(403)
    expect(
      (await callback.POST(await request(true, "https://evil.example"))).status,
    ).toBe(403)
    expect(revoke).not.toHaveBeenCalled()
    expect(provider.post).not.toHaveBeenCalled()
    expect(await auth.validateToken(`Bearer ${sessionToken}`)).not.toBeNull()
  })
})
