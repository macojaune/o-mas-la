import type { ConfigContext, ExpoConfig } from "expo/config"

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "O Mas La ?",
  slug: "omasla-app",
  owner: "marvinldotcom",
  scheme: "omasla",
  version: "2.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  updates: { url: "https://u.expo.dev/1674bb77-7b4b-4066-a363-51d3329987c7" },
  ios: {
    bundleIdentifier: "com.marvinl.omasla",
    supportsTablet: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ["location"],
    },
  },
  android: {
    package: "com.marvinl.omasla",
    ...(process.env.GOOGLE_SERVICES_JSON
      ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON }
      : {}),
    ...(process.env.GOOGLE_MAPS_API_KEY
      ? { config: { googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY } } }
      : {}),
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#f7f4ee",
    },
  },
  web: { bundler: "metro", output: "single", favicon: "./assets/icon.png" },
  extra: {
    androidMapsConfigured: Boolean(process.env.GOOGLE_MAPS_API_KEY),
    eas: { projectId: "1674bb77-7b4b-4066-a363-51d3329987c7" },
  },
  experiments: { typedRoutes: true },
  plugins: [
    "@maplibre/maplibre-react-native",
    "expo-router",
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        image: "./assets/icon.png",
        imageWidth: 180,
        backgroundColor: "#f7f4ee",
      },
    ],
    [
      "expo-location",
      {
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
        locationWhenInUsePermission:
          "Votre position permet de vous retrouver sur la carte, de déclarer un groupe ou de partager son suivi, uniquement à votre demande.",
        locationAlwaysAndWhenInUsePermission:
          "En tant que référent, partagez la position de votre groupe même lorsque l’écran est verrouillé, jusqu’à l’arrêt du suivi.",
      },
    ],
    "expo-notifications",
  ],
  runtimeVersion: { policy: "appVersion" },
})
