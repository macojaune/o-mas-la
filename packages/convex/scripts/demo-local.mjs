/** Synthetic map scene, strictly restricted to the isolated local Convex deployment. */
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseEnv } from "node:util"
import { ConvexHttpClient } from "convex/browser"
import { makeFunctionReference } from "convex/server"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")
const envFile = resolve(root, "packages/convex/.env.local")
const config = parseEnv(readFileSync(resolve(root, ".env"), "utf8"))
const selected = parseEnv(readFileSync(envFile, "utf8"))
const backend = "http://127.0.0.1:3210"
assert.ok(config.CONVEX_URL === backend, "Refusing another HTTP backend")
assert.ok(selected.CONVEX_URL === backend, "Refusing another CLI backend")
assert.ok(
  selected.CONVEX_DEPLOYMENT?.startsWith("anonymous:"),
  "Refusing a linked/cloud deployment",
)
// Convex resolves its actual CLI port from this configuration, not CONVEX_URL.
const localDeployment = JSON.parse(
  readFileSync(
    resolve(root, "packages/convex/.convex/local/default/config.json"),
    "utf8",
  ),
)
assert.ok(
  localDeployment.deploymentName ===
    selected.CONVEX_DEPLOYMENT.slice("anonymous:".length) &&
    localDeployment.ports?.cloud === 3210,
  "Refusing another local deployment or port",
)
const issuer = config.AUTH_ISSUER_URL
assert.ok(
  issuer &&
    ["localhost", "127.0.0.1", "[::1]"].includes(new URL(issuer).hostname),
  "Refusing a non-local issuer",
)
for (const name of [
  "CONVEX_DEPLOY_KEY",
  "CONVEX_DEPLOYMENT_TOKEN",
  "CONVEX_DEPLOYMENT",
  "CONVEX_SELF_HOSTED_URL",
  "CONVEX_SELF_HOSTED_ADMIN_KEY",
]) {
  assert.ok(
    process.env[name] === undefined,
    `Refusing externally supplied ${name}`,
  )
  if (name !== "CONVEX_DEPLOYMENT")
    assert.ok(
      selected[name] === undefined,
      `Refusing ${name} in local deployment file`,
    )
}
const command = process.argv[2] ?? "status"
assert.ok(
  ["start", "stop", "status"].includes(command),
  "Use start, stop or status (with the local Convex dev server already running)",
)
function runConvex(args) {
  try {
    return execFileSync(
      "pnpm",
      [
        "--filter",
        "@oyo/convex",
        "exec",
        "convex",
        ...args,
        "--env-file",
        envFile,
      ],
      {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    )
  } catch (error) {
    // Do not dump CLI arguments, deployment credentials or environment on failure.
    throw new Error(
      `Local Convex command failed (exit ${error.status ?? "unknown"})`,
    )
  }
}
if (command === "start" || command === "stop") {
  const name = command === "start" ? "seedNativeDemo" : "stopNativeDemo"
  const result = JSON.parse(
    runConvex(["run", `localFixtures:${name}`, JSON.stringify({ issuer })]),
  )
  console.log(JSON.stringify(result))
}
const client = new ConvexHttpClient(backend)
const catalog = await client.query(makeFunctionReference("catalog:list"), {})
const now = Date.now()
const scene = {
  synthetic: true,
  backend,
  checkedAt: new Date(now).toISOString(),
  policy: catalog.policy,
  groups: catalog.groups
    .filter((group) => group.title.endsWith("· démo"))
    .map((group) => ({
      id: group.id,
      title: group.title,
      live: group.live,
      position: group.position,
    })),
  stopCommand: "node packages/convex/scripts/demo-local.mjs stop",
  limits:
    "Synthetic positions every 30 seconds, at most 2 hours. The older observation simulates a 7-minute reporting delay. No device GPS or production proof.",
}
mkdirSync(resolve(root, ".cache"), { recursive: true })
writeFileSync(
  resolve(root, ".cache/native-demo-scene.json"),
  `${JSON.stringify(scene, null, 2)}\n`,
)
console.log(JSON.stringify(scene, null, 2))
