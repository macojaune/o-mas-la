import type { AuthConfig } from "convex/server"

const issuer = process.env.AUTH_ISSUER_URL
// No fallback issuer: a deployment must explicitly name its own trusted Auth.js service.
if (!issuer || issuer.endsWith("/"))
  throw new Error(
    "AUTH_ISSUER_URL must name the exact issuer without a trailing slash",
  )
export default {
  providers: [
    {
      type: "customJwt",
      issuer,
      applicationID: "omasla-convex",
      algorithm: "RS256",
      jwks: `${issuer}/api/auth/jwks`,
    },
  ],
} satisfies AuthConfig
