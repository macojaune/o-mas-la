import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    AUTH_DISCORD_ID: z.string().min(1).optional(),
    AUTH_DISCORD_SECRET: z.string().min(1).optional(),
    AUTH_SECRET: z.string().min(32).optional(),
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

if (
  typeof window === "undefined" &&
  !!env.AUTH_DISCORD_ID !== !!env.AUTH_DISCORD_SECRET
) {
  throw new Error(
    "AUTH_DISCORD_ID and AUTH_DISCORD_SECRET must be configured together",
  )
}
if (typeof window === "undefined" && env.AUTH_DISCORD_ID && !env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET is required when OAuth is configured")
}
