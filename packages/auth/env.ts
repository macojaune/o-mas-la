import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    AUTH_GOOGLE_ID: z.string().min(1).optional(),
    AUTH_GOOGLE_SECRET: z.string().min(1).optional(),
    AUTH_APPLE_ID: z.string().min(1).optional(),
    AUTH_APPLE_SECRET: z.string().min(1).optional(),
    AUTH_BREVO_API_KEY: z.string().min(1).optional(),
    AUTH_EMAIL_FROM: z.string().email().optional(),
    AUTH_SECRET: z.string().min(32).optional(),
    AUTH_URL: z.string().url().optional(),
    AUTH_ISSUER_URL: z.string().url().optional(),
    AUTH_JWT_PRIVATE_KEY: z.string().min(1).optional(),
    AUTH_JWT_KEY_ID: z.string().min(1).optional(),
    CONVEX_URL: z.string().url().optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  },
  client: {},
  experimental__runtimeEnv: {},
  emptyStringAsUndefined: true,
})

if (typeof window === "undefined") {
  const pairs = [
    ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"],
    ["AUTH_APPLE_ID", "AUTH_APPLE_SECRET"],
    ["AUTH_BREVO_API_KEY", "AUTH_EMAIL_FROM"],
  ] as const
  const loginConfigured = pairs.some(([id]) => !!env[id])
  for (const [id, secret] of pairs) {
    if (!!env[id] !== !!env[secret])
      throw new Error(`${id} and ${secret} must be configured together`)
    if (env[id] && (!env.AUTH_SECRET || !env.AUTH_ISSUER_URL || !env.AUTH_URL))
      throw new Error(
        "AUTH_SECRET, AUTH_URL and AUTH_ISSUER_URL are required when login is configured",
      )
  }
  if (env.AUTH_URL && env.AUTH_URL !== env.AUTH_ISSUER_URL)
    throw new Error("AUTH_URL must match AUTH_ISSUER_URL exactly")
  for (const value of [env.AUTH_URL, env.AUTH_ISSUER_URL]) {
    if (value && new URL(value).origin !== value)
      throw new Error(
        "Auth origins must not contain a path, query or trailing slash",
      )
    if (
      value &&
      loginConfigured &&
      new URL(value).protocol !== "https:" &&
      !(
        env.NODE_ENV === "development" &&
        new URL(value).hostname === "localhost"
      )
    )
      throw new Error("Login requires HTTPS outside localhost development")
  }
  if (env.AUTH_APPLE_ID && !env.AUTH_ISSUER_URL?.startsWith("https://"))
    throw new Error("Apple requires an HTTPS auth origin")
}
