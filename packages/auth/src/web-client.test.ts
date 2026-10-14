import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { safeSignOut } from "./convex-client"

vi.mock("next-auth/react", () => ({
  getCsrfToken: () => Promise.resolve("fixture-csrf"),
}))
const assign = vi.fn()
beforeEach(() => {
  assign.mockReset()
  vi.stubGlobal("window", {
    location: { origin: "https://fixture.example", assign },
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe("explicit web logout result", () => {
  it("keeps the current page when revocation fails instead of reporting a successful logout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 503 })),
    )
    await expect(safeSignOut("/map")).rejects.toThrow(
      "Déconnexion non confirmée",
    )
    expect(assign).not.toHaveBeenCalled()
  })
  it("leaves the authenticated screen only after a successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
    )
    await safeSignOut("/map")
    expect(assign).toHaveBeenCalledWith("https://fixture.example/map")
  })
  it("does not accept an external logout destination", async () => {
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)
    await expect(safeSignOut("https://evil.example")).rejects.toThrow(
      "Invalid logout destination",
    )
    expect(fetch).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
  })
})
