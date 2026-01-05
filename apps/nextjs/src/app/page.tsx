"use client"

import Image from "next/image"
import Link from "next/link"
import {
  Heart,
  MapPin,
  Megaphone,
  Navigation,
  Share2,
  Sparkles,
} from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@oyo/ui/button"
import { Card } from "@oyo/ui/card"
import { ThemeToggle } from "@oyo/ui/theme"

export default function HomePage() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  return (
    <main className="min-h-screen">
      <div className="fixed bottom-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <section className="relative flex h-screen items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/bg.jpeg"
            alt="background"
            width={2048}
            height={1638}
            className="object-fill object-center md:object-cover"
          />
          {/*// Hero section gradient*/}
          <div className="backdrop-blur-xs absolute inset-0 bg-gradient-to-b from-primary/10 to-primary/40" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          <span className="mb-4 text-6xl font-bold text-white md:text-8xl">
            O Mas La ?
          </span>
          <h1 className="mb-6 text-5xl text-white md:text-7xl">
            Suivez votre carnaval en temps réel!
          </h1>
          <p className="mb-8 text-xl text-white/90 md:text-2xl">
            Ne manquez plus aucun groupe grâce à la géolocalisation en direct
          </p>
          <Link href="/map">
            <Button size="lg" variant="secondary" className="dark:text-white">
              Voir la carte
            </Button>
          </Link>
          {/* New Sponsor div */}
          {/*<div className="mt-44 flex flex-col items-center justify-center gap-3 rounded-lg p-4 backdrop-blur-sm md:mt-12 md:flex-row">
            <div className="text-base font-semibold text-white dark:text-gray-300">
              Merci à
            </div>
            <div className="w-20">
              <a
                href="https://rci.fm/guadeloupe/carnaval"
                target="_blank"
                rel="noreferrer"
              >
                <Image
                  src="/rci-logo.png"
                  width={1776}
                  height={1692}
                  alt="logo RCI Guadeloupe"
                />
              </a>
            </div>
            <div className="text-base font-semibold text-white dark:text-gray-300">
              de soutenir le projet durant les jours gras.
            </div>
          </div>*/}
        </div>
      </section>
      {/* How it Works Section */}
      <section className="py-20">
        <div className="container mx-auto flex flex-col items-center gap-16 px-4">
          <h2 className="text-center text-4xl font-bold">
            Comment ça marche ?
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: <MapPin className="h-12 w-12 text-primary" />,
                title: "Trouve tes groupes",
                description:
                  "Consulte la carte interactive pour localiser les groupes en temps réel",
              },
              {
                icon: <Navigation className="h-12 w-12 text-primary" />,
                title: "Suivez les déplacements",
                description:
                  "Sélectionne tes groupes préférés et suis leurs parcours en direct",
              },
              {
                icon: <Share2 className="h-12 w-12 text-primary" />,
                title: "Partage ta position",
                description:
                  "Collabore au projet en partageant la position des groupes à proximité",
              },
            ].map((item, index) => (
              <Card
                key={index}
                className="p-6 text-center transition-shadow hover:shadow-lg"
              >
                <div className="mb-4 flex justify-center">{item.icon}</div>
                <h3 className="mb-3 text-xl font-semibold">{item.title}</h3>
                <p className="text-gray-400">{item.description}</p>
              </Card>
            ))}
          </div>
          <Link href="/map">
            <Button
              size="lg"
              variant={!isDark ? "primary" : "outline"}
              className="dark:text-white"
            >
              <MapPin className="mr-2 h-6 w-6" />
              Accède à la carte
            </Button>
          </Link>
        </div>
      </section>

      {/* Pour les Membres Section */}
      <section className="bg-neutral-900 py-20">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/80 to-purple-900/90 backdrop-blur-sm" />
        </div>

        <div className="container relative z-10 mx-auto px-4 text-center">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-4xl font-bold text-primary">
              Carnavalier·e ?
            </h2>
            <p className="mb-8 text-xl text-gray-400">
              Télécharge l'application et partage la position de ton groupe en
              direct.
            </p>
            <div className="mb-8 flex flex-col items-center justify-center space-y-4">
              {[
                "Plus précis",
                "Plus facile à utiliser",
                "Plus de visibilité",
              ].map((benefit, index) => (
                <div
                  key={index}
                  className="flex w-1/3 items-center justify-start gap-2"
                >
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <p className="text-lg text-gray-500">{benefit}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <a
                href="https://apps.apple.com/fr/app/o-mas-la/id6740550162"
                target="_blank"
              >
                <Button size="lg" variant="primary">
                  Apple store
                </Button>
              </a>
              <Button size="lg" disabled variant="primary">
                Android (bientot disponible)
              </Button>
            </div>
          </div>
        </div>
      </section>
      {/* Sponsorship Section */}
      <section className="h-[100dvh] bg-gradient-to-br from-primary/10 to-primary/20">
        <div className="container mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-4 text-center">
          <h2 className="mb-4 text-4xl font-bold">Soutenez le projet</h2>
          <p className="mb-8 text-xl text-gray-500">
            Devenez sponsor de O Mas La ? et contribuez à améliorer l'expérience
            du carnaval pour tous. Votre soutien nous aidera à maintenir et
            développer ce service gratuit.
          </p>
          {/* // Find the sponsorship section and update the benefits array */}
          <div className="mb-12 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: <Megaphone className="h-12 w-12 text-primary" />,
                title: "Visibilité",
                description: "Gagnez en visibilité pendant le carnaval",
              },
              {
                icon: <Heart className="h-12 w-12 text-primary" />,
                title: "Impact Social",
                description: "Contribuez à un projet communautaire innovant",
              },
              {
                icon: <Sparkles className="h-12 w-12 text-primary" />,
                title: "Sur Mesure",
                description: "Co-créez des expériences carnavalesques inédites",
              },
            ].map((item, index) => (
              <Card
                key={index}
                className="p-6 text-center transition-shadow hover:shadow-lg"
              >
                <div className="mb-4 flex justify-center">{item.icon}</div>
                <h3 className="mb-3 text-xl font-semibold">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.description}</p>
              </Card>
            ))}
          </div>
          <a href="https://tally.so/r/3EvMVo" target="_blank" rel="noopener">
            <Button size="lg" variant="primary">
              Devenir sponsor
            </Button>
          </a>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-neutral-900 py-12 text-white">
        <p className="mb-8 text-center font-mono text-lg">
          Tambouriné avec ❤️ par
          <a href="https://marvinl.com" target="_blank">
            <Button variant="link">MarvinL.com</Button>
          </a>
        </p>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div>
              <h3 className="mb-4 text-lg font-semibold">Contact</h3>
              <ul className="space-y-2">
                <li>info@omasla.fr</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-lg font-semibold">Légal</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/mentions-legales">
                    <Button variant="ghost">Mentions légales</Button>
                  </Link>
                </li>
                <li>
                  <Link href="/politique-de-confidentialite">
                    <Button variant="ghost">
                      Politique de confidentialité
                    </Button>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-lg font-semibold">
                Application Carnavalier·e (à venir)
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://apps.apple.com/fr/app/o-mas-la/id6740550162"
                    target="_blank"
                  >
                    <Button variant="ghost">App Store</Button>
                  </a>
                </li>
                <li>
                  <Button variant="ghost" disabled>
                    Google Play
                  </Button>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2024 | O Mas La ? − Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </main>
    // </HydrateClient>
  )
}
