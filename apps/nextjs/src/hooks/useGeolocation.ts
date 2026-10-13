"use client"

import { useCallback, useState } from "react"

export function useGeolocation() {
  const [position, setPosition] = useState<GeolocationPosition>()
  const [error, setError] = useState<string>()
  const [isLocating, setLocating] = useState(false)

  const requestPosition = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("La localisation n'est pas disponible dans ce navigateur.")
      return
    }
    setLocating(true)
    setError(undefined)
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition(result)
        setLocating(false)
      },
      () => {
        setError(
          "Position indisponible. Vérifie l'autorisation de localisation puis réessaie.",
        )
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    )
  }, [])
  return { position, error, isLocating, requestPosition }
}
