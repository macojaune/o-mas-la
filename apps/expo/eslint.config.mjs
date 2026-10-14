import baseConfig from "@oyo/eslint-config/base"
import reactConfig from "@oyo/eslint-config/react"

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".expo/**", "expo-plugins/**", "ios/**", "android/**"],
  },
  ...baseConfig,
  ...reactConfig,
]
