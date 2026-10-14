import { cookies } from "next/headers"

import { invalidateSessionToken, validateToken } from "./config"

export async function revokeBrowserSession() {
  const store = await cookies()
  const token =
    store.get("__Secure-authjs.session-token")?.value ??
    store.get("authjs.session-token")?.value
  if (token && (await validateToken(`Bearer ${token}`)))
    await invalidateSessionToken(`Bearer ${token}`)
}
