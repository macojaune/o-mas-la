import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const storage = vi.hoisted(() => ({
  token: "fixture-session-token-12345678901234567890" as string | null,
  pending: false,
  auth: null as string | null,
}))
vi.mock("../../../apps/expo/src/utils/session-store", () => ({
  getToken: () => storage.token,
  setToken: (token: string) => {
    storage.token = token
  },
  deleteToken: () => {
    storage.token = null
    return Promise.resolve()
  },
  isLogoutPending: () => storage.pending,
  markLogoutPending: () => {
    storage.pending = true
  },
  clearLogoutPending: () => {
    storage.pending = false
    return Promise.resolve()
  },
  getPendingAuth: () => storage.auth,
  setPendingAuth: (value: string) => {
    storage.auth = value
  },
  clearPendingAuth: () => {
    storage.auth = null
    return Promise.resolve()
  },
}))
vi.mock("../../../apps/expo/src/utils/base-url", () => ({
  getBaseUrl: () => "https://fixture.example",
}))
const cryptoCalls = vi.hoisted(() => ({ random: vi.fn(), digest: vi.fn() }))
const browser = vi.hoisted(() => ({ openAuthSessionAsync: vi.fn() }))
vi.mock("expo-crypto", () => ({
  getRandomBytesAsync: cryptoCalls.random,
  digestStringAsync: cryptoCalls.digest,
  CryptoDigestAlgorithm: { SHA256: "SHA256" },
  CryptoEncoding: { BASE64: "BASE64" },
}))
vi.mock("expo-web-browser", () => browser)

beforeEach(() => {
  vi.resetModules()
  storage.token = "fixture-session-token-12345678901234567890"
  storage.pending = false
  storage.auth = null
  cryptoCalls.random.mockReset().mockResolvedValue(new Uint8Array(32).fill(1))
  cryptoCalls.digest.mockReset().mockResolvedValue("c".repeat(43))
  browser.openAuthSessionAsync.mockReset()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const access = () =>
  new Response(
    JSON.stringify({
      token: "signed-fixture-jwt",
      expiresAt: Date.now() + 60_000,
      user: { id: "fixture-user", name: "Fixture" },
    }),
    { status: 200 },
  )

describe("native credential lifecycle", () => {
  it("keeps an immediate logout newer than the login intention before its first microtask", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({})))
    const client = await import("../../../apps/expo/src/utils/auth-client")
    const login = client.nativeSignIn()
    await client.nativeSignOut()
    expect(await login).toBe(false)
    expect(storage.auth).toBeNull()
    expect(storage.token).toBeNull()
    expect(browser.openAuthSessionAsync).not.toHaveBeenCalled()
  })
  it("does not recreate a pending login after logout during deferred PKCE generation", async () => {
    let resume: (value: Uint8Array) => void = () => undefined
    cryptoCalls.random.mockImplementationOnce(
      () =>
        new Promise<Uint8Array>((resolve) => {
          resume = resolve
        }),
    )
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({})))
    const client = await import("../../../apps/expo/src/utils/auth-client")
    const login = client.nativeSignIn()
    expect(client.nativeSignIn()).toBe(login)
    await vi.waitFor(() => expect(cryptoCalls.random).toHaveBeenCalledTimes(1))
    await client.nativeSignOut()
    resume(new Uint8Array(32).fill(1))
    expect(await login).toBe(false)
    expect(storage.auth).toBeNull()
    expect(storage.token).toBeNull()
    expect(browser.openAuthSessionAsync).not.toHaveBeenCalled()
  })
  it("restores a valid session while deduplicating token exchange", async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(access()))
    vi.stubGlobal("fetch", fetch)
    const client = await import("../../../apps/expo/src/utils/auth-client")
    expect(
      await Promise.all([
        client.fetchConvexAccessToken(),
        client.fetchConvexAccessToken(),
      ]),
    ).toEqual(["signed-fixture-jwt", "signed-fixture-jwt"])
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(client.currentUser()?.id).toBe("fixture-user")
  })
  it("discards a token response that arrives after logout", async () => {
    let resolveToken: (response: Response) => void = () => {
      throw new Error("Missing pending request")
    }
    const fetch = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveToken = resolve
          }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
    vi.stubGlobal("fetch", fetch)
    const client = await import("../../../apps/expo/src/utils/auth-client")
    const pending = client.fetchConvexAccessToken()
    await client.nativeSignOut()
    resolveToken(access())
    expect(await pending).toBeNull()
    expect(client.currentUser()).toBeNull()
    expect(storage.token).toBeNull()
  })
  it("blocks background auth after an offline logout, including after restart, then allows revocation retry", async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error("offline"))
    vi.stubGlobal("fetch", fetch)
    let client = await import("../../../apps/expo/src/utils/auth-client")
    await expect(client.nativeSignOut()).rejects.toThrow("offline")
    expect(storage.pending).toBe(true)
    expect(storage.token).not.toBeNull()
    expect(await client.fetchConvexAccessToken()).toBeNull()
    vi.resetModules()
    client = await import("../../../apps/expo/src/utils/auth-client")
    expect(await client.fetchConvexAccessToken()).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(1)
    fetch.mockResolvedValueOnce(new Response("{}", { status: 200 }))
    await client.nativeSignOut()
    expect(storage.pending).toBe(false)
    expect(storage.token).toBeNull()
  })
  it("removes a rejected session and never reuses its token", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 401 }))
    vi.stubGlobal("fetch", fetch)
    const client = await import("../../../apps/expo/src/utils/auth-client")
    expect(await client.fetchConvexAccessToken()).toBeNull()
    expect(storage.token).toBeNull()
    expect(await client.fetchConvexAccessToken()).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it("completes a cold-start email return from persisted PKCE once across concurrent listeners", async () => {
    const state = "fixture-persisted-state-12345678901234567890"
    const verifier = "fixture-persisted-verifier-1234567890123456789012345"
    storage.token = null
    storage.auth = JSON.stringify({
      state,
      verifier,
      origin: "https://fixture.example",
      expiresAt: Date.now() + 600_000,
    })
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ sessionToken: "new-fixture-session-token-1234567890" }),
      )
      .mockImplementation(() => Promise.resolve(access()))
    vi.stubGlobal("fetch", fetch)
    const client = await import("../../../apps/expo/src/utils/auth-client")
    const url = `omasla://login?code=${"a".repeat(43)}&state=${state}`
    expect(
      await Promise.all([
        client.completeNativeSignIn(url),
        client.completeNativeSignIn(url),
      ]),
    ).toEqual([true, true])
    expect(fetch).toHaveBeenCalledTimes(2)
    const [, request] = fetch.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(request.body as string)).toEqual({
      code: "a".repeat(43),
      verifier,
    })
    expect(storage.auth).toBeNull()
    expect(storage.token).toBe("new-fixture-session-token-1234567890")
    expect(client.currentUser()?.id).toBe("fixture-user")
  })
  it("refuses expired, mismatched and foreign-origin persisted continuations before exchange", async () => {
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)
    const client = await import("../../../apps/expo/src/utils/auth-client")
    for (const variation of [
      { expiresAt: Date.now() - 1 },
      { state: "another-state" },
      { origin: "https://other.example" },
    ]) {
      storage.auth = JSON.stringify({
        verifier: "v".repeat(64),
        state: "s".repeat(48),
        origin: "https://fixture.example",
        expiresAt: Date.now() + 60_000,
        ...variation,
      })
      await expect(
        client.completeNativeSignIn(
          `omasla://login?code=${"a".repeat(43)}&state=${"s".repeat(48)}`,
        ),
      ).rejects.toThrow("expiré")
    }
    expect(
      await client.completeNativeSignIn("https://evil.example/login"),
    ).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })
  it("does not install a late exchanged email session after logout", async () => {
    storage.auth = JSON.stringify({
      verifier: "v".repeat(64),
      state: "s".repeat(48),
      origin: "https://fixture.example",
      expiresAt: Date.now() + 60_000,
    })
    let resolve: (response: Response) => void = () => undefined
    const fetch = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((done) => {
            resolve = done
          }),
      )
      .mockResolvedValueOnce(Response.json({}))
    vi.stubGlobal("fetch", fetch)
    const client = await import("../../../apps/expo/src/utils/auth-client")
    const completion = client.completeNativeSignIn(
      `omasla://login?code=${"a".repeat(43)}&state=${"s".repeat(48)}`,
    )
    await client.nativeSignOut()
    resolve(
      Response.json({ sessionToken: "late-session-token-123456789012345" }),
    )
    expect(await completion).toBe(false)
    expect(storage.token).toBeNull()
    expect(storage.auth).toBeNull()
  })
})
