import NetInfo from "@react-native-community/netinfo"
import { ConvexHttpClient } from "convex/browser"

import { fetchConvexAccessToken } from "~/utils/auth-client"

/** HTTP calls fail rather than enter ConvexReactClient's offline mutation queue. */
export async function authenticatedClient() {
  const network = await NetInfo.fetch()
  if (network.isConnected !== true || network.isInternetReachable === false)
    throw new Error("Vous êtes hors ligne. Reconnectez-vous puis réessayez.")
  const token = await fetchConvexAccessToken()
  if (!token) throw new Error("Connectez-vous pour continuer.")
  const url = process.env.EXPO_PUBLIC_CONVEX_URL
  if (!url) throw new Error("Le service est temporairement indisponible.")
  const client = new ConvexHttpClient(url)
  client.setAuth(token)
  return client
}
export function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : ""
  if (/offline|network|fetch|hors ligne/i.test(message))
    return "La connexion a été interrompue. Vérifiez le réseau avant de réessayer."
  if (
    /GROUP_ALREADY_LIVE|LIVE_ACTIVE|live.*active|active.*live|SESSION_ACTIVE/i.test(
      message,
    )
  )
    return "Ce groupe est maintenant suivi en direct. La déclaration n’a pas été publiée."
  if (message.includes("INVALID_OBSERVATION_TIME"))
    return "L’heure du relevé n’a pas été acceptée. Vérifiez la date et l’heure automatiques du téléphone, puis réessayez avec une nouvelle position."
  if (/SESSION_ENDED|HANDOFF_NOT_AVAILABLE|EMITTER_REVOKED/.test(message))
    return "Ce suivi ou cette proposition de relais n’est plus disponible. Actualisez votre espace."
  if (/AUTH_|UNAUTHENTICATED|TOKEN|Connectez/i.test(message))
    return "Votre connexion a expiré. Connectez-vous à nouveau."
  if (/FORBIDDEN|REFERENT|habilit/i.test(message))
    return "Ce compte n’est pas autorisé pour cette action."
  if (/POLICY|CONFIGURATION|configuration/i.test(message))
    return "Le suivi n’est pas encore disponible pour ce groupe."
  return "L’action n’a pas pu être confirmée. Réessayez dans un instant."
}
