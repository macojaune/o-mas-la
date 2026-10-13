import type { Metadata, Viewport } from "next"
import Script from "next/script"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"

import { cn } from "@oyo/ui"
import { ThemeProvider } from "@oyo/ui/theme"
import { Toaster } from "@oyo/ui/toast"

import { TRPCReactProvider } from "~/trpc/react"
import { ConvexClientProvider } from "./convex-client-provider"

import "~/app/globals.css"

import { env } from "~/env"

const title = "O Mas la? - Trouve tes groupes de carnaval préférés sans effort"
const description =
  "La solution pour suivre tes groupes de caranaval préférés, fini les dimanches soirs à courir" +
  " inutilement dans Pointe-à-pitre"
const metadataBase = new URL(
  env.NODE_ENV === "production" ? "https://omasla.fr" : "http://localhost:3000",
)

export const metadata: Metadata = {
  metadataBase,
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "O Mas La ?",
    images: [{ url: `${metadataBase}/omasla-og-image.png` }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@macojaune",
    images: [`${metadataBase}/omasla-og-image.png`],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-foreground antialiased",
          GeistSans.variable,
          GeistMono.variable,
        )}
      >
        {env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true" && (
          <Script
            src="https://analytics.macojaune.com/script.js"
            data-website-id="638989fa-9ab3-4a30-b342-0c9d4103f87f"
            defer
          />
        )}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ConvexClientProvider>
            <TRPCReactProvider>{props.children}</TRPCReactProvider>
          </ConvexClientProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
