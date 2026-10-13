import { AsyncLocalStorage } from "node:async_hooks"

export interface AuthRequestContext {
  nativeGrantId?: string
  usedNativeGrantId?: string | null
}

export const authRequestContext = new AsyncLocalStorage<AuthRequestContext>()
