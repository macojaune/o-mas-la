import * as SecureStore from "expo-secure-store"

const key = "session_token"
const logoutKey = "session_logout_pending"
export const getToken = () => SecureStore.getItem(key)
export const deleteToken = () => SecureStore.deleteItemAsync(key)
export const setToken = (v: string) => SecureStore.setItem(key, v)
export const isLogoutPending = () => SecureStore.getItem(logoutKey) === "true"
export const markLogoutPending = () => SecureStore.setItem(logoutKey, "true")
export const clearLogoutPending = () => SecureStore.deleteItemAsync(logoutKey)
