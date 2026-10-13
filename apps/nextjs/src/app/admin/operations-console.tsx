"use client"

import type { FormEvent, ReactNode } from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ConvexHttpClient } from "convex/browser"
import { useConvexAuth, useConvexConnectionState, useQuery } from "convex/react"

import type { Id, TrackingPolicy } from "@oyo/convex"
import { safeSignOut } from "@oyo/auth/convex-client"
import { api } from "@oyo/convex"
import { Button } from "@oyo/ui/button"

import { env } from "~/env"

const field = "min-w-0 w-full rounded-md border bg-background px-3 py-2 text-sm"
const date = (value: number) => new Date(value).toLocaleString("fr-FR")
const age = (value: number, now: number) => {
  const seconds = Math.max(0, Math.floor((now - value) / 1000))
  if (seconds < 60) return `${seconds} s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
  return `${Math.floor(seconds / 3600)} h`
}

async function authorizedClient() {
  if (!navigator.onLine)
    throw new Error("Reconnecte-toi avant d’effectuer cette action.")
  const response = await fetch("/api/auth/convex-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    cache: "no-store",
  })
  if (!response.ok)
    throw new Error("La connexion a expiré. Reconnecte-toi pour continuer.")
  const result = (await response.json()) as { token: string }
  const client = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL)
  client.setAuth(result.token)
  return client
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 space-y-4 rounded-xl border bg-card p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export function OperationsConsole({ signedIn }: { signedIn: boolean }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const [error, setError] = useState("")
  const [initialized, setInitialized] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  useEffect(() => {
    if (!isAuthenticated) return
    let active = true
    void authorizedClient()
      .then((client) => client.mutation(api.accounts.ensure, {}))
      .then(() => {
        if (active) setInitialized(true)
      })
      .catch(() => {
        if (active)
          setError(
            "Impossible de vérifier tes droits. Recharge la page une fois la connexion rétablie.",
          )
      })
    return () => {
      active = false
    }
  }, [isAuthenticated])
  const account = useQuery(
    api.accounts.me,
    isAuthenticated && initialized ? {} : "skip",
  )
  return (
    <main className="mx-auto min-h-screen max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/map" className="text-sm text-primary underline">
            ← Retour aux groupes
          </Link>
          <h1 className="mt-3 text-3xl font-bold">Permanence terrain</h1>
          <p className="mt-2 text-muted-foreground">
            Suivi des lives et contributions du public.
          </p>
        </div>
        {signedIn && (
          <Button
            variant="outline"
            disabled={loggingOut}
            onClick={() => {
              setLoggingOut(true)
              void safeSignOut("/map").catch(() => {
                setError(
                  "Déconnexion non confirmée. Rétablis la connexion puis réessaie.",
                )
                setLoggingOut(false)
              })
            }}
          >
            Se déconnecter
          </Button>
        )}
      </header>
      {error && (
        <p role="alert" className="rounded-md border border-destructive p-4">
          {error}
        </p>
      )}
      {!signedIn ? (
        <Section title="Connexion requise">
          <p>Cet espace est réservé aux personnes habilitées.</p>
          <Button asChild>
            <Link href="/api/auth/signin?callbackUrl=/admin">Se connecter</Link>
          </Button>
        </Section>
      ) : isLoading || !account ? (
        <p role="status">Vérification des droits…</p>
      ) : account.role === "spectator" ? (
        <Section title="Accès réservé">
          <p>
            Ton compte n’a pas de rôle de modération. Un administrateur peut
            t’habiliter.
          </p>
        </Section>
      ) : (
        <Console role={account.role} currentAccountId={account.id} />
      )}
    </main>
  )
}

function Console({
  role,
  currentAccountId,
}: {
  role: "admin" | "moderator"
  currentAccountId: Id<"accounts">
}) {
  const connection = useConvexConnectionState()
  const lives = useQuery(api.administration.overview, {})
  const queue = useQuery(api.administration.moderationQueue, {})
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState("")
  const [failed, setFailed] = useState(false)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const run = async (
    operation: (client: ConvexHttpClient) => Promise<unknown>,
    success: string,
  ) => {
    if (pending) return
    setPending(true)
    setNotice("")
    setFailed(false)
    try {
      await operation(await authorizedClient())
      setNotice(success)
    } catch {
      setNotice(
        "L’action n’a pas pu être confirmée. Vérifie la connexion et l’état affiché avant de réessayer.",
      )
      setFailed(true)
    } finally {
      setPending(false)
    }
  }
  const disabled = pending || !connection.isWebSocketConnected
  return (
    <>
      {!connection.isWebSocketConnected && (
        <p role="status" className="rounded-md border p-4">
          Connexion interrompue. Les actions sont suspendues ; les données
          affichées peuvent avoir changé.
        </p>
      )}
      {notice && (
        <p role={failed ? "alert" : "status"} className="rounded-md border p-4">
          {notice}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Lives en cours">
          {lives === undefined ? (
            <p>Chargement…</p>
          ) : lives.length === 0 ? (
            <p>Aucun live en cours.</p>
          ) : (
            lives.map((live) => (
              <div key={live.id} className="space-y-2 border-t pt-4">
                <h3 className="font-semibold">{live.title}</h3>
                <p className="text-sm">
                  Référent actif : {live.emitterDisplayName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Démarré le {date(live.startedAt)} · Fin maximale :{" "}
                  {date(live.expiresAt)}
                </p>
                <p className="text-sm">
                  {live.lastObservedAt
                    ? `Dernier relevé : il y a ${age(live.lastObservedAt, now)} · ${date(live.lastObservedAt)}`
                    : "Aucun relevé reçu."}
                </p>
                {live.speedWarningAt && (
                  <p className="font-medium">
                    Avertissement vitesse depuis {date(live.speedWarningAt)}.
                  </p>
                )}
                <Button
                  variant="destructive"
                  disabled={disabled}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Arrêter le live de ${live.title} ? Le référent devra en démarrer un nouveau.`,
                      )
                    )
                      void run(
                        (client) =>
                          client.mutation(api.sessions.stopAsModerator, {
                            sessionId: live.id,
                          }),
                        "Live arrêté. Les prochains points de cette session seront refusés.",
                      )
                  }}
                >
                  Arrêter le live
                </Button>
              </div>
            ))
          )}
        </Section>
        <Section title="Observations du public">
          {queue === undefined ? (
            <p>Chargement…</p>
          ) : queue.observations.length === 0 ? (
            <p>Aucune observation à afficher.</p>
          ) : (
            queue.observations.map((observation) => (
              <div key={observation.id} className="space-y-2 border-t pt-4">
                <h3 className="font-semibold">{observation.groupTitle}</h3>
                <p className="text-sm">
                  {observation.observedAt
                    ? `Observé le ${date(observation.observedAt)}`
                    : `Reçu le ${date(observation.receivedAt)} · heure d’observation inconnue`}
                </p>
                <Button
                  variant="outline"
                  disabled={disabled}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Retirer cette observation de ${observation.groupTitle} ?`,
                      )
                    )
                      void run(
                        (client) =>
                          client.mutation(api.observations.retract, {
                            positionId: observation.id,
                          }),
                        "Observation retirée.",
                      )
                  }}
                >
                  Retirer l’observation
                </Button>
              </div>
            ))
          )}
        </Section>
      </div>
      <Section title="Derniers événements">
        <p className="text-sm text-muted-foreground">
          Les 50 événements les plus récents. Horaires affichés dans le fuseau
          de cet appareil.
        </p>
        {queue?.events.length === 0 && <p>Aucun événement.</p>}
        <ul className="divide-y">
          {queue?.events.map((event) => (
            <li key={event.id} className="py-3">
              <span className="font-medium">{event.groupTitle}</span>
              <span className="ml-2">
                {event.type === "handoff"
                  ? "Passation"
                  : event.type === "speed_warning"
                    ? "Avertissement vitesse"
                    : `Live arrêté${event.reason ? ` · ${reasonLabels[event.reason]}` : ""}`}
              </span>
              <span className="block text-sm text-muted-foreground">
                {date(event.occurredAt)}
              </span>
            </li>
          ))}
        </ul>
      </Section>
      <Administration
        canManageTeamRoles={role === "admin"}
        currentAccountId={currentAccountId}
        disabled={disabled}
        run={run}
      />
    </>
  )
}

const reasonLabels = {
  manual: "arrêt manuel",
  moderation: "modération",
  gps_failed: "GPS indisponible",
  logout: "déconnexion",
  duration: "durée maximale",
  zone: "sortie de zone",
  speed: "vitesse persistante",
  revoked: "habilitation retirée",
}
type Run = (
  operation: (client: ConvexHttpClient) => Promise<unknown>,
  success: string,
) => Promise<void>

function Administration({
  canManageTeamRoles,
  currentAccountId,
  disabled,
  run,
}: {
  canManageTeamRoles: boolean
  currentAccountId: Id<"accounts">
  disabled: boolean
  run: Run
}) {
  const directory = useQuery(api.administration.readAdminDirectory, {})
  const storedPolicy = useQuery(api.administration.getPolicy, {})
  const [accountId, setAccountId] = useState<Id<"accounts"> | "">("")
  const [groupId, setGroupId] = useState<Id<"groups"> | "">("")
  return (
    <>
      <Section title="Habilitations">
        <p className="text-sm text-muted-foreground">
          Les référents doivent se connecter une première fois pour apparaître
          ici. Un référent est habilité pour chaque groupe séparément.
        </p>
        {directory === undefined ? (
          <p>Chargement…</p>
        ) : (
          <>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1 space-y-1">
                Compte
                <select
                  className={field}
                  value={accountId}
                  onChange={(event) =>
                    setAccountId(event.target.value as Id<"accounts">)
                  }
                >
                  <option value="">Choisir un compte</option>
                  {directory.accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="min-w-0 flex-1 space-y-1">
                Groupe
                <select
                  className={field}
                  value={groupId}
                  onChange={(event) =>
                    setGroupId(event.target.value as Id<"groups">)
                  }
                >
                  <option value="">Choisir un groupe</option>
                  {directory.groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.title}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                disabled={disabled || !accountId || !groupId}
                onClick={() => {
                  if (accountId && groupId)
                    void run(
                      (client) =>
                        client.mutation(api.administration.grantReferent, {
                          accountId,
                          groupId,
                        }),
                      "Référent habilité.",
                    )
                }}
              >
                Habiliter
              </Button>
            </div>
            <ul className="divide-y">
              {directory.grants.map((grant) => (
                <li
                  key={`${grant.accountId}:${grant.groupId}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <span>
                    {
                      directory.accounts.find(
                        (account) => account.id === grant.accountId,
                      )?.displayName
                    }{" "}
                    ·{" "}
                    {
                      directory.groups.find(
                        (group) => group.id === grant.groupId,
                      )?.title
                    }
                  </span>
                  <Button
                    variant="outline"
                    disabled={disabled}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Retirer cette habilitation ? Son live en cours sera arrêté.",
                        )
                      )
                        void run(
                          (client) =>
                            client.mutation(
                              api.administration.revokeReferent,
                              grant,
                            ),
                          "Habilitation retirée.",
                        )
                    }}
                  >
                    Retirer l’habilitation
                  </Button>
                </li>
              ))}
            </ul>
            {canManageTeamRoles && (
              <>
                <h3 className="pt-4 font-semibold">Rôles de l’équipe</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {directory.accounts.map((account) => (
                    <label key={account.id} className="space-y-1">
                      {account.displayName}
                      <select
                        className={field}
                        value={account.role}
                        disabled={disabled || account.id === currentAccountId}
                        onChange={(event) => {
                          const role = event.target.value as
                            | "spectator"
                            | "moderator"
                            | "admin"
                          if (
                            window.confirm(
                              `Changer le rôle de ${account.displayName} ?`,
                            )
                          )
                            void run(
                              (client) =>
                                client.mutation(api.administration.setRole, {
                                  accountId: account.id,
                                  role,
                                }),
                              "Rôle mis à jour.",
                            )
                        }}
                      >
                        <option value="spectator">Spectateur / référent</option>
                        <option value="moderator">Modérateur</option>
                        <option value="admin">Administrateur</option>
                      </select>
                    </label>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </Section>
      {storedPolicy !== undefined && (
        <PolicyForm
          key={storedPolicy?._id ?? "new"}
          policy={storedPolicy?.policy ?? null}
          disabled={disabled}
          run={run}
        />
      )}
    </>
  )
}

const policyFields = [
  {
    key: "freshForMs",
    label: "Position récente pendant (secondes)",
    scale: 1000,
  },
  {
    key: "hideAfterMs",
    label: "Retirer le repère après (secondes)",
    scale: 1000,
  },
  {
    key: "maxDurationMs",
    label: "Durée maximale d’un live (heures)",
    scale: 3_600_000,
  },
  {
    key: "maxFutureSkewMs",
    label: "Tolérance d’horloge future (secondes)",
    scale: 1000,
  },
  {
    key: "maxSampleAgeMs",
    label: "Âge maximal d’un nouveau relevé (secondes)",
    scale: 1000,
  },
  {
    key: "maxAccuracyMeters",
    label: "Incertitude GPS maximale (mètres)",
    scale: 1,
  },
  { key: "latitude", label: "Centre de zone · latitude", scale: 1 },
  { key: "longitude", label: "Centre de zone · longitude", scale: 1 },
  {
    key: "radiusMeters",
    label: "Rayon autour du centre (kilomètres)",
    scale: 1000,
  },
  {
    key: "confirmationMs",
    label: "Confirmer la sortie de zone pendant (secondes)",
    scale: 1000,
  },
  { key: "thresholdMps", label: "Seuil de vitesse (km/h)", scale: 1 / 3.6 },
  {
    key: "persistenceMs",
    label: "Vitesse persistante avant avertissement (secondes)",
    scale: 1000,
  },
  {
    key: "warningMs",
    label: "Délai après avertissement vitesse (secondes)",
    scale: 1000,
  },
  {
    key: "maxGapMs",
    label: "Écart maximal entre relevés de vitesse (secondes)",
    scale: 1000,
  },
] as const

function PolicyForm({
  policy,
  disabled,
  run,
}: {
  policy: TrackingPolicy | null
  disabled: boolean
  run: Run
}) {
  const initial = policy ? { ...policy, ...policy.zone, ...policy.speed } : null
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const n = (key: (typeof policyFields)[number]["key"]) =>
      Number(data.get(key)) *
      (policyFields.find((item) => item.key === key)?.scale ?? 1)
    const updated: TrackingPolicy = {
      freshForMs: n("freshForMs"),
      hideAfterMs: n("hideAfterMs"),
      maxDurationMs: n("maxDurationMs"),
      maxFutureSkewMs: n("maxFutureSkewMs"),
      maxSampleAgeMs: n("maxSampleAgeMs"),
      maxAccuracyMeters: n("maxAccuracyMeters"),
      zone: {
        latitude: n("latitude"),
        longitude: n("longitude"),
        radiusMeters: n("radiusMeters"),
        confirmationMs: n("confirmationMs"),
      },
      speed: {
        thresholdMps: n("thresholdMps"),
        persistenceMs: n("persistenceMs"),
        warningMs: n("warningMs"),
        maxGapMs: n("maxGapMs"),
      },
    }
    void run(
      (client) =>
        client.mutation(api.administration.setPolicy, { policy: updated }),
      "Réglages enregistrés. Les nouveaux seuils d’arrêt s’appliqueront aux prochains lives.",
    )
  }
  return (
    <Section title="Réglages du suivi">
      <p className="text-sm text-muted-foreground">
        À calibrer sur le terrain. La fraîcheur d’affichage est commune ; chaque
        live conserve les seuils d’arrêt choisis à son démarrage.
      </p>
      {!policy && (
        <p>
          Aucun réglage enregistré. Le démarrage des lives et les contributions
          restent bloqués.
        </p>
      )}
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {policyFields.map((item) => (
            <label key={item.key} className="space-y-1 text-sm">
              {item.label}
              <input
                className={field}
                type="number"
                name={item.key}
                required
                step="any"
                min={
                  item.key === "latitude"
                    ? -90
                    : item.key === "longitude"
                      ? -180
                      : item.key === "maxFutureSkewMs"
                        ? 0
                        : 0.001
                }
                max={
                  item.key === "latitude"
                    ? 90
                    : item.key === "longitude"
                      ? 180
                      : undefined
                }
                defaultValue={initial ? initial[item.key] / item.scale : ""}
                disabled={disabled}
              />
            </label>
          ))}
        </div>
        <Button type="submit" disabled={disabled}>
          Enregistrer les réglages
        </Button>
      </form>
    </Section>
  )
}
