export const NATIVE_REDIRECT_URI = "omasla://login"
export const NATIVE_COOKIE_NAME = "omasla-native-auth"
export const NATIVE_FLOW_SECONDS = 15 * 60
export const NATIVE_CODE_SECONDS = 90

export function validNativeRedirect(value: unknown): value is string {
  // Exact equality deliberately refuses ports, encoded hosts, query and fragments.
  return value === NATIVE_REDIRECT_URI
}

export function validProofChallenge(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value)
}

export function validVerifier(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9._~-]{43,128}$/.test(value)
}

export function validClientState(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(value)
}

export function bearerSession(value: string | null): string | null {
  const match = value?.match(/^Bearer ([A-Za-z0-9._~-]{20,255})$/)
  return match?.[1] ?? null
}

export function sessionCookieValue(cookies: string[]): string | null {
  for (const cookie of cookies) {
    const match = /^(?:__Secure-)?authjs\.session-token=([^;]+);/.exec(cookie)
    if (match?.[1]) return match[1]
  }
  return null
}

export function encodeBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

export async function proofChallenge(verifier: string): Promise<string> {
  return encodeBase64Url(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
    ),
  )
}

export function randomCode(): string {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)))
}
