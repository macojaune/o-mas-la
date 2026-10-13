import AsyncStorage from "@react-native-async-storage/async-storage"

const KEY = "omasla.auth-return.v1"
export type AuthReturn =
  | { pathname: "/account" }
  | { pathname: "/observe"; params: { groupId: string } }
export function saveAuthReturn(groupId?: string) {
  return AsyncStorage.setItem(
    KEY,
    JSON.stringify(
      groupId
        ? { pathname: "/observe", params: { groupId } }
        : { pathname: "/account" },
    ),
  )
}
export async function consumeAuthReturn(): Promise<AuthReturn> {
  const raw = await AsyncStorage.getItem(KEY)
  await AsyncStorage.removeItem(KEY)
  try {
    const value: unknown = raw ? JSON.parse(raw) : null
    if (
      typeof value === "object" &&
      value &&
      "pathname" in value &&
      value.pathname === "/observe" &&
      "params" in value &&
      typeof value.params === "object" &&
      value.params &&
      "groupId" in value.params &&
      typeof value.params.groupId === "string" &&
      value.params.groupId.length > 0 &&
      value.params.groupId.length < 200
    )
      return { pathname: "/observe", params: { groupId: value.params.groupId } }
  } catch {
    /* An invalid return path falls back to the account screen. */
  }
  return { pathname: "/account" }
}
