"use client"

import type { ReactNode } from "react"
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react"
import { SessionProvider } from "next-auth/react"

import { useConvexAuth } from "@oyo/auth/convex-client"

import { env } from "~/env"

const convex = new ConvexReactClient(env.NEXT_PUBLIC_CONVEX_URL)

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ConvexProviderWithAuth client={convex} useAuth={useConvexAuth}>
        {children}
      </ConvexProviderWithAuth>
    </SessionProvider>
  )
}
