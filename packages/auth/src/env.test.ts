import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv("AUTH_DISCORD_ID", "")
  vi.stubEnv("AUTH_DISCORD_SECRET", "")
  vi.stubEnv("AUTH_SECRET", "")
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("optional OAuth environment", () => {
  it("permits public operation without configured OAuth credentials", async () => {
    const { env } = await import("../env")
    expect(env.AUTH_DISCORD_ID).toBeUndefined()
    expect(env.AUTH_SECRET).toBeUndefined()
  })
  it("refuses a half-configured provider instead of silently disabling validation in CI", async () => {
    vi.stubEnv("CI", "true")
    vi.stubEnv("AUTH_DISCORD_ID", "fixture-client")
    await expect(import("../env")).rejects.toThrow("configured together")
  })
  it("does not read private variables when the shared environment is imported in the browser", async () => {
    vi.stubGlobal("window", {})
    vi.stubEnv("AUTH_DISCORD_ID", "fixture-client")
    await expect(import("../env")).resolves.toBeDefined()
  })
})
