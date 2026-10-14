"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getProviders, signIn } from "next-auth/react"

const loginErrors: Record<string, string> = {
  OAuthAccountNotLinked:
    "Cette adresse est déjà associée à un autre mode de connexion. Utilisez le mode habituel ou un lien reçu par email.",
  Verification:
    "Ce lien a expiré ou a déjà été utilisé. Demandez un nouveau lien.",
  AccessDenied:
    "La connexion n’a pas été autorisée. Réessayez avec une adresse vérifiée.",
  NativeAuthFailed:
    "Le retour vers l’app a expiré. Fermez cette fenêtre et recommencez depuis l’app.",
}

export function LoginForm({
  callbackUrl,
  error,
}: {
  callbackUrl: string
  error?: string
}) {
  const [providers, setProviders] = useState<string[] | null>(null)
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState(
    error
      ? (loginErrors[error] ??
          "La connexion n’a pas abouti. Réessayez dans quelques instants.")
      : "",
  )

  useEffect(() => {
    let active = true
    void getProviders()
      .then((result) => {
        if (active) setProviders(Object.keys(result ?? {}))
      })
      .catch(() => {
        if (active) {
          setProviders([])
          setMessage(
            "Les modes de connexion sont temporairement indisponibles.",
          )
        }
      })
    return () => {
      active = false
    }
  }, [])

  async function connect(provider: string) {
    setBusy(provider)
    setMessage("")
    try {
      if (provider === "email") {
        const result = await signIn("email", {
          email,
          redirect: false,
          redirectTo: callbackUrl,
        })
        if (result.error || !result.ok || !result.url) {
          setMessage(
            "Le lien n’a pas pu être envoyé. Attendez une minute avant de réessayer ; si le problème persiste, utilisez un autre mode de connexion.",
          )
          setBusy(null)
          return
        }
        window.location.assign(result.url)
      } else {
        await signIn(provider, { redirectTo: callbackUrl })
      }
    } catch {
      setMessage(
        "La connexion est indisponible. Vérifiez votre connexion et réessayez.",
      )
      setBusy(null)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="space-y-2">
        <Link href="/map" className="text-sm underline">
          O Mas La ?
        </Link>
        <h1 className="text-3xl font-semibold">Se connecter</h1>
        <p className="text-sm text-muted-foreground">
          Un compte permet de déclarer la position d’un groupe et d’accéder à
          votre espace référent. La consultation reste libre.
        </p>
      </div>
      {message && (
        <p
          role="alert"
          className="rounded-md border border-destructive p-3 text-sm"
        >
          {message}
        </p>
      )}
      {providers === null ? (
        <p role="status">Chargement des modes de connexion…</p>
      ) : providers.length === 0 ? (
        <p role="status" className="rounded-md border p-4 text-sm">
          La connexion n’est pas encore configurée. Vous pouvez consulter les
          groupes librement.
        </p>
      ) : (
        <div className="space-y-4">
          {(["google", "apple"] as const)
            .filter((id) => providers.includes(id))
            .map((id) => (
              <button
                key={id}
                type="button"
                disabled={busy !== null}
                onClick={() => void connect(id)}
                className="w-full rounded-md border px-4 py-3 font-medium disabled:opacity-50"
              >
                {busy === id
                  ? "Ouverture…"
                  : `Continuer avec ${id === "google" ? "Google" : "Apple"}`}
              </button>
            ))}
          {providers.includes("email") && (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                void connect("email")
              }}
            >
              <label
                htmlFor="login-email"
                className="block text-sm font-medium"
              >
                Adresse email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={busy !== null}
                className="w-full rounded-md border bg-background px-3 py-3"
              />
              <button
                type="submit"
                disabled={busy !== null}
                className="w-full rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground disabled:opacity-50"
              >
                {busy === "email"
                  ? "Envoi du lien…"
                  : "Recevoir un lien de connexion"}
              </button>
              <p className="text-xs text-muted-foreground">
                Sans mot de passe. Le lien expire après 15 minutes et ne
                fonctionne qu’une seule fois.
              </p>
            </form>
          )}
        </div>
      )}
      <Link href="/map" className="text-center text-sm underline">
        Consulter les groupes
      </Link>
    </main>
  )
}
