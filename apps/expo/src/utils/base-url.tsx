export function getBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL
  if (!configured)
    throw new Error("La connexion aux comptes est momentanément indisponible.")
  let url: URL
  try {
    url = new URL(configured)
  } catch {
    throw new Error("La connexion aux comptes est momentanément indisponible.")
  }
  if (url.protocol !== "https:" && !(__DEV__ && url.protocol === "http:"))
    throw new Error("L’adresse du service de connexion n’est pas sécurisée.")
  return url.origin
}
