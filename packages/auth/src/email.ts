import { createHmac } from "node:crypto"
import type { EmailConfig } from "next-auth/providers/email"
import { z } from "zod"

import { lt, sql } from "@oyo/db"
import { db } from "@oyo/db/client"
import { AuthEmailLimit } from "@oyo/db/schema"

import { env } from "../env"

export const EMAIL_LINK_SECONDS = 15 * 60

export function normalizeEmail(value: string) {
  const email = value.normalize("NFKC").trim().toLowerCase()
  if (
    !z.string().email().max(254).safeParse(email).success ||
    /[\s,;<>"\r\n]/.test(email)
  )
    throw new Error("Invalid email address")
  return email
}

async function takeQuota(
  key: string,
  seconds: number,
  limit: number,
  now: number,
) {
  const bucket = Math.floor(now / (seconds * 1000))
  const row = await db
    .insert(AuthEmailLimit)
    .values({
      key: `${key}:${bucket}`,
      count: 1,
      expires: new Date((bucket + 1) * seconds * 1000),
    })
    .onConflictDoUpdate({
      target: AuthEmailLimit.key,
      set: { count: sql`${AuthEmailLimit.count} + 1` },
    })
    .returning()
  return !!row[0] && row[0].count <= limit
}

export async function allowEmailSend(identifier: string, now = Date.now()) {
  if (!env.AUTH_SECRET)
    throw new Error("Email authentication is not configured")
  await db
    .delete(AuthEmailLimit)
    .where(lt(AuthEmailLimit.expires, new Date(now)))
  // Global cap also bounds storage growth from arbitrary addresses. We do not
  // trust a client-supplied X-Forwarded-For header as a rate-limit identity.
  if (!(await takeQuota("global", 15 * 60, 300, now))) return false
  const hash = createHmac("sha256", env.AUTH_SECRET)
    .update(normalizeEmail(identifier))
    .digest("hex")
  if (!(await takeQuota(`email:${hash}`, 15 * 60, 3, now))) return false
  return takeQuota(`cooldown:${hash}`, 60, 1, now)
}

export function emailProvider(): EmailConfig {
  return {
    id: "email",
    name: "Email",
    type: "email",
    maxAge: EMAIL_LINK_SECONDS,
    from: env.AUTH_EMAIL_FROM,
    normalizeIdentifier: normalizeEmail,
    sendVerificationRequest({ identifier, url }) {
      const sending = (async () => {
        if (!env.AUTH_BREVO_API_KEY || !env.AUTH_EMAIL_FROM)
          throw new Error("Email authentication is unavailable")
        // No tracking, marketing subscription, raw token logging or API response
        // bodies in errors. Brevo receives only this transactional login message.
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": env.AUTH_BREVO_API_KEY,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(10_000),
          body: JSON.stringify({
            sender: { email: env.AUTH_EMAIL_FROM, name: "O Mas La ?" },
            to: [{ email: identifier }],
            subject: "Votre lien de connexion à O Mas La ?",
            textContent: `Pour vous connecter à O Mas La ?, ouvrez ce lien dans les 15 prochaines minutes :\n\n${url}\n\nCe lien ne peut être utilisé qu’une seule fois. Si vous n’avez pas demandé cette connexion, ignorez ce message.`,
            headers: { "X-Mailin-Tag": "authentication" },
          }),
        })
        if (!response.ok)
          throw new Error("Email delivery is temporarily unavailable")
      })()
      // Auth.js starts delivery, awaits token hashing, then attaches Promise.all.
      // Register a rejection handler now to avoid an unhandled-rejection race;
      // return the original rejected promise so Auth.js still reports failure.
      void sending.catch(() => undefined)
      return sending
    },
  }
}
