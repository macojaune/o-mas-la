/** Integration against a real local Next/Auth.js + Convex runtime, using synthetic accounts only. */
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseEnv } from "node:util"
import { createClient } from "@libsql/client"
import { ConvexHttpClient } from "convex/browser"
import { makeFunctionReference } from "convex/server"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")
const config = parseEnv(readFileSync(resolve(root, ".env"), "utf8"))
const issuer = config.AUTH_ISSUER_URL
const backend = config.CONVEX_URL
for (const value of [issuer, backend])
  assert.equal(
    new URL(value).hostname,
    value === issuer ? "localhost" : "127.0.0.1",
    "Local smoke test requires the isolated loopback environment",
  )
assert.equal(
  config.DB_URL,
  `file:${resolve(root, ".cache/omasla-auth.db")}`,
  "Refusing to write any other database",
)
const forbiddenOverrides = [
  "CONVEX_DEPLOY_KEY",
  "CONVEX_DEPLOYMENT_TOKEN",
  "CONVEX_DEPLOYMENT",
  "CONVEX_SELF_HOSTED_URL",
  "CONVEX_SELF_HOSTED_ADMIN_KEY",
]
for (const name of forbiddenOverrides)
  assert.equal(
    process.env[name],
    undefined,
    `Refusing externally supplied ${name}`,
  )
const selected = parseEnv(
  readFileSync(resolve(root, "packages/convex/.env.local"), "utf8"),
)
assert.ok(
  selected.CONVEX_DEPLOYMENT?.startsWith("anonymous:"),
  "Refusing any linked/cloud Convex deployment",
)
for (const name of forbiddenOverrides.filter(
  (name) => name !== "CONVEX_DEPLOYMENT",
))
  assert.equal(
    selected[name],
    undefined,
    `Refusing ${name} in local deployment file`,
  )
assert.equal(
  selected.CONVEX_URL,
  backend,
  "Local CLI and HTTP targets must agree",
)
const principals = {
  admin: "simulation-admin",
  moderator: "simulation-moderator",
  referent: "simulation-referent",
  otherReferent: "simulation-other-referent",
  spectator: "simulation-spectator",
}
const fixture = JSON.parse(
  execFileSync(
    "pnpm",
    [
      "--filter",
      "@oyo/convex",
      "exec",
      "convex",
      "run",
      "--env-file",
      resolve(root, "packages/convex/.env.local"),
      "localFixtures:seedScenario",
      JSON.stringify({
        issuer,
        adminSubject: principals.admin,
        moderatorSubject: principals.moderator,
        referentSubject: principals.referent,
        otherReferentSubject: principals.otherReferent,
        spectatorSubject: principals.spectator,
      }),
    ],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ),
)
assert.equal(fixture.synthetic, true)
const db = createClient({ url: config.DB_URL })
const sessions = {}
for (const [role, id] of Object.entries(principals)) {
  const token = randomUUID()
  await db.execute({
    sql: "INSERT INTO user (id,name,email) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name",
    args: [id, `[SIMULATION] ${role}`, `${id}@example.invalid`],
  })
  await db.execute({
    sql: "INSERT INTO session (sessionToken,userId,expires) VALUES (?,?,?)",
    args: [token, id, Math.floor(Date.now() / 1000) + 3600],
  })
  sessions[role] = token
}
mkdirSync(resolve(root, ".cache"), { recursive: true })
writeFileSync(
  resolve(root, ".cache/local-test-sessions.json"),
  JSON.stringify(sessions),
  { mode: 0o600 },
)
const ref = (name) => makeFunctionReference(name)
const publicClient = new ConvexHttpClient(backend)
const initial = await publicClient.query(ref("catalog:list"), {})
assert.ok(initial.groups.find((group) => group.id === fixture.groupId))
assert.ok(initial.groups.find((group) => group.title.includes("sans position")))
let checks = 2
async function clientFor(role) {
  const response = await fetch(`${issuer}/api/auth/convex-token`, {
    method: "POST",
    headers: { authorization: `Bearer ${sessions[role]}` },
  })
  assert.equal(response.status, 200, await response.clone().text())
  const { token, expiresAt } = await response.json()
  assert.ok(expiresAt <= Date.now() + 61000)
  const client = new ConvexHttpClient(backend)
  client.setAuth(token)
  await client.mutation(ref("accounts:ensure"), {})
  return client
}
const [admin, moderator, referent, other, spectator] = await Promise.all([
  clientFor("admin"),
  clientFor("moderator"),
  clientFor("referent"),
  clientFor("otherReferent"),
  clientFor("spectator"),
])
checks += 5
await assert.rejects(
  publicClient.mutation(ref("sessions:start"), {
    groupId: fixture.groupId,
    deviceId: "anonymous",
    requestId: randomUUID(),
  }),
  /AUTH_REQUIRED/,
)
await assert.rejects(
  spectator.query(ref("administration:overview"), {}),
  /FORBIDDEN/,
)
checks += 2
const active = await admin.query(ref("administration:overview"), {})
for (const item of active.filter((item) => item.groupId === fixture.groupId))
  await admin.mutation(ref("sessions:stopAsModerator"), { sessionId: item.id })
// Exercise operational permissions with a genuine moderator JWT from the local Auth.js session.
const directory = await moderator.query(
  ref("administration:readAdminDirectory"),
  {},
)
assert.equal(
  directory.accounts.find(
    (account) => account.id === fixture.accounts.moderator,
  )?.role,
  "moderator",
)
assert.equal(
  directory.accounts.find(
    (account) => account.id === fixture.accounts.spectator,
  )?.role,
  "spectator",
)
assert.deepEqual(Object.keys(directory).sort(), [
  "accounts",
  "grants",
  "groups",
])
for (const [collection, fields] of [
  ["accounts", ["displayName", "id", "role"]],
  ["groups", ["id", "title"]],
  ["grants", ["accountId", "groupId"]],
])
  for (const entry of directory[collection])
    assert.deepEqual(Object.keys(entry).sort(), fields)
const currentPolicy = await moderator.query(ref("administration:getPolicy"), {})
assert.ok(
  currentPolicy?.policy,
  "The local simulation must have an explicit tracking policy",
)
const policyId = await moderator.mutation(ref("administration:setPolicy"), {
  policy: currentPolicy.policy,
})
const savedPolicy = await moderator.query(ref("administration:getPolicy"), {})
assert.equal(savedPolicy._id, policyId)
assert.equal(savedPolicy.createdBy, fixture.accounts.moderator)
assert.deepEqual(savedPolicy.policy, currentPolicy.policy)
const permission = {
  accountId: fixture.accounts.spectator,
  groupId: fixture.groupId,
}
await moderator.mutation(ref("administration:grantReferent"), permission)
assert.ok(
  (
    await moderator.query(ref("administration:readAdminDirectory"), {})
  ).grants.some(
    (grant) =>
      grant.accountId === permission.accountId &&
      grant.groupId === permission.groupId,
  ),
)
await moderator.mutation(ref("administration:revokeReferent"), permission)
assert.ok(
  !(
    await moderator.query(ref("administration:readAdminDirectory"), {})
  ).grants.some(
    (grant) =>
      grant.accountId === permission.accountId &&
      grant.groupId === permission.groupId,
  ),
)
checks += 5
for (const [kind, name, args] of [
  ["query", "administration:readAdminDirectory", {}],
  ["query", "administration:getPolicy", {}],
  ["mutation", "administration:setPolicy", { policy: currentPolicy.policy }],
  ["mutation", "administration:grantReferent", permission],
  ["mutation", "administration:revokeReferent", permission],
]) {
  await assert.rejects(spectator[kind](ref(name), args), /FORBIDDEN/)
  checks += 1
}
await assert.rejects(
  moderator.mutation(ref("administration:setRole"), {
    accountId: fixture.accounts.moderator,
    role: "admin",
  }),
  /FORBIDDEN/,
)
await assert.rejects(
  spectator.mutation(ref("administration:setRole"), {
    accountId: fixture.accounts.spectator,
    role: "admin",
  }),
  /FORBIDDEN/,
)
checks += 2
const observedAt = Date.now()
const observationRequestId = randomUUID()
const positionId = await spectator.mutation(ref("observations:create"), {
  groupId: fixture.groupId,
  requestId: observationRequestId,
  latitude: 16.24,
  longitude: -61.53,
  observedAt,
})
assert.equal(
  (await publicClient.query(ref("catalog:list"), {})).groups.find(
    (group) => group.id === fixture.groupId,
  ).position.source,
  "community",
)
// A lost-response receipt is scoped to the authenticated principal, even with the same request id.
const receiptArgs = { requestId: observationRequestId }
await assert.rejects(
  publicClient.query(ref("observations:byRequest"), receiptArgs),
  /AUTH_REQUIRED/,
)
assert.deepEqual(
  await spectator.query(ref("observations:byRequest"), receiptArgs),
  { positionId, groupId: fixture.groupId, observedAt },
)
assert.equal(
  await other.query(ref("observations:byRequest"), receiptArgs),
  null,
)
const otherObservedAt = Date.now()
const otherPositionId = await other.mutation(ref("observations:create"), {
  groupId: fixture.groupId,
  requestId: observationRequestId,
  latitude: 16.241,
  longitude: -61.531,
  observedAt: otherObservedAt,
})
assert.notEqual(otherPositionId, positionId)
assert.deepEqual(
  await other.query(ref("observations:byRequest"), receiptArgs),
  {
    positionId: otherPositionId,
    groupId: fixture.groupId,
    observedAt: otherObservedAt,
  },
)
assert.deepEqual(
  await spectator.query(ref("observations:byRequest"), receiptArgs),
  { positionId, groupId: fixture.groupId, observedAt },
)
checks += 6
await admin.mutation(ref("observations:retract"), {
  positionId: otherPositionId,
})
await admin.mutation(ref("observations:retract"), { positionId })
assert.notEqual(
  (await publicClient.query(ref("catalog:list"), {})).groups.find(
    (group) => group.id === fixture.groupId,
  ).position?.id,
  positionId,
)
checks += 2
const live = await referent.mutation(ref("sessions:start"), {
  groupId: fixture.groupId,
  deviceId: "simulation-phone-a",
  requestId: randomUUID(),
})
await assert.rejects(
  other.mutation(ref("sessions:start"), {
    groupId: fixture.groupId,
    deviceId: "simulation-phone-b",
    requestId: randomUUID(),
  }),
  /GROUP_ALREADY_LIVE/,
)
await assert.rejects(
  spectator.mutation(ref("observations:create"), {
    groupId: fixture.groupId,
    requestId: randomUUID(),
    latitude: 16.24,
    longitude: -61.53,
    observedAt: Date.now(),
  }),
  /GROUP_ALREADY_LIVE/,
)
const sample = {
  sessionId: live.id,
  deviceId: "simulation-phone-a",
  generation: live.generation,
  sampleId: randomUUID(),
  latitude: 16.24,
  longitude: -61.53,
  observedAt: Date.now(),
  accuracyMeters: 5,
  speedMps: 1,
}
assert.equal(
  (await referent.mutation(ref("telemetry:ingest"), sample)).accepted,
  true,
)
assert.equal(
  (await publicClient.query(ref("catalog:list"), {})).groups.find(
    (group) => group.id === fixture.groupId,
  ).position.source,
  "referent",
)
checks += 4
await referent.mutation(ref("sessions:offerHandoff"), {
  sessionId: live.id,
  deviceId: sample.deviceId,
  generation: live.generation,
  targetAccountId: fixture.accounts.otherReferent,
})
const relayed = await other.mutation(ref("sessions:acceptHandoff"), {
  sessionId: live.id,
  deviceId: "simulation-phone-b",
  generation: live.generation,
})
await assert.rejects(
  referent.mutation(ref("telemetry:ingest"), {
    ...sample,
    sampleId: randomUUID(),
    observedAt: Date.now(),
  }),
  /EMITTER|STALE|FORBIDDEN/,
)
await admin.mutation(ref("sessions:stopAsModerator"), { sessionId: live.id })
const afterStop = await other.mutation(ref("telemetry:ingest"), {
  ...sample,
  deviceId: "simulation-phone-b",
  generation: relayed.generation,
  sampleId: randomUUID(),
  observedAt: Date.now(),
})
assert.equal(afterStop.sessionEnded, true)
assert.equal(afterStop.accepted, false)
checks += 3
// Native logout must revoke the still-unexpired access JWT as well as the database session.
const logout = await fetch(`${issuer}/api/auth/native/logout`, {
  method: "POST",
  headers: { authorization: `Bearer ${sessions.otherReferent}` },
})
assert.equal(logout.status, 200, await logout.text())
await assert.rejects(other.query(ref("sessions:mine"), {}), /AUTH_REVOKED/)
assert.equal(
  (
    await fetch(`${issuer}/api/auth/convex-token`, {
      method: "POST",
      headers: { authorization: `Bearer ${sessions.otherReferent}` },
    })
  ).status,
  401,
)
checks += 3
assert.equal(
  (
    await fetch(`${issuer}/api/auth/convex-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: "https://other.invalid",
        cookie: `authjs.session-token=${sessions.admin}`,
      },
      body: "{}",
    })
  ).status,
  403,
)
checks += 1
// Leave a current community observation for visual QA, with its actual observation time.
await spectator.mutation(ref("observations:create"), {
  groupId: fixture.groupId,
  requestId: randomUUID(),
  latitude: 16.24,
  longitude: -61.53,
  observedAt: Date.now(),
})
db.close()
console.log(
  JSON.stringify(
    {
      result: "passed",
      checks,
      environment: { web: issuer, convex: backend },
      synthetic: true,
      addedCoverage: [
        "Moderator JWT: minimal directory, policy read/write, referent grant/revoke",
        "Spectator denied every settings/permission operation; moderator and spectator denied platform role promotion",
        "Observation receipt isolated by authenticated account, including a reused request id",
      ],
      limits: [
        "OAuth provider not exercised",
        "No physical device/background GPS proof",
      ],
    },
    null,
    2,
  ),
)
