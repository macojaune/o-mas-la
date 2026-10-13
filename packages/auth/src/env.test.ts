import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

beforeEach(() => {
  vi.resetModules()
  for (const name of [
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET",
    "AUTH_APPLE_ID",
    "AUTH_APPLE_SECRET",
    "AUTH_BREVO_API_KEY",
    "AUTH_EMAIL_FROM",
    "AUTH_ISSUER_URL",
    "AUTH_URL",
  ])
    vi.stubEnv(name, "")
  vi.stubEnv("AUTH_SECRET", "")
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("optional OAuth environment", () => {
  it("rejects mismatched canonical origins and production HTTP login", async () => {
    vi.stubEnv("AUTH_SECRET", "fixture-secret-with-at-least-32-characters")
    vi.stubEnv("AUTH_GOOGLE_ID", "fixture-google")
    vi.stubEnv("AUTH_GOOGLE_SECRET", "fixture-google-secret")
    vi.stubEnv("AUTH_ISSUER_URL", "https://auth.example.invalid")
    vi.stubEnv("AUTH_URL", "https://evil.example.invalid")
    await expect(import("../env")).rejects.toThrow("must match")
    vi.resetModules()
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("AUTH_ISSUER_URL", "http://auth.example.invalid")
    vi.stubEnv("AUTH_URL", "http://auth.example.invalid")
    await expect(import("../env")).rejects.toThrow("requires HTTPS")
  })
  it("permits public operation without configured OAuth credentials", async () => {
    const { env } = await import("../env")
    expect(env.AUTH_GOOGLE_ID).toBeUndefined()
    expect(env.AUTH_SECRET).toBeUndefined()
  })
  it("refuses a half-configured provider instead of silently disabling validation in CI", async () => {
    vi.stubEnv("CI", "true")
    vi.stubEnv("AUTH_GOOGLE_ID", "fixture-client")
    await expect(import("../env")).rejects.toThrow("configured together")
  })
  it("does not read private variables when the shared environment is imported in the browser", async () => {
    vi.stubGlobal("window", {})
    vi.stubEnv("AUTH_GOOGLE_ID", "fixture-client")
    await expect(import("../env")).resolves.toBeDefined()
  })
})
