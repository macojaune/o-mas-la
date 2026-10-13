import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const storage = vi.hoisted(() => ({
  token: "fixture-session-token-12345678901234567890" as string | null,
  pending: false,
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
}))
vi.mock("../../../apps/expo/src/utils/base-url", () => ({
  getBaseUrl: () => "https://fixture.example",
}))
vi.mock("expo-crypto", () => ({}))
vi.mock("expo-web-browser", () => ({}))

beforeEach(() => {
  vi.resetModules()
  storage.token = "fixture-session-token-12345678901234567890"
  storage.pending = false
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
})
