/** Create fresh local development secrets without reading production configuration. */
import { generateKeyPairSync, randomBytes } from "node:crypto"
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const destination = resolve(root, ".env")
if (existsSync(destination))
  throw new Error(
    "An environment already exists. Preserve it; review .env.example manually.",
  )
mkdirSync(resolve(root, ".cache"), { recursive: true })
const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
})
const values = {
  DB_URL: `file:${resolve(root, ".cache/omasla-auth.db")}`,
  AUTH_SECRET: randomBytes(32).toString("hex"),
  AUTH_ISSUER_URL: "http://localhost:3185",
  AUTH_JWT_PRIVATE_KEY: JSON.stringify(privateKey),
  AUTH_JWT_KEY_ID: "local-development",
  CONVEX_URL: "http://127.0.0.1:3210",
  NEXT_PUBLIC_CONVEX_URL: "http://127.0.0.1:3210",
  EXPO_PUBLIC_CONVEX_URL: "http://127.0.0.1:3210",
  EXPO_PUBLIC_API_URL: "http://localhost:3185",
  NEXT_PUBLIC_APP_URL: "http://localhost:3185",
  PORT: "3185",
  NEXT_PUBLIC_ANALYTICS_ENABLED: "false",
}
writeFileSync(
  destination,
  Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n") + "\n",
  { mode: 0o600 },
)
console.log(
  "Created .env for local development. No production credentials used; secrets not displayed.",
)
