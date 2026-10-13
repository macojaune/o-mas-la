"use client"

import { useCallback, useRef, useState } from "react"

export function useGeolocation() {
  const [error, setError] = useState<string>()
  const [isLocating, setLocating] = useState(false)
  const generation = useRef(0)
  const reset = useCallback(() => {
    generation.current += 1
    setError(undefined)
    setLocating(false)
  }, [])

  const requestPosition = useCallback(async () => {
    const current = ++generation.current
    setLocating(true)
    setError(undefined)
    try {
      const startedAt = Date.now()
      if (!("geolocation" in navigator))
        throw new Error(
          "La localisation n'est pas disponible dans ce navigateur.",
        )
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15_000,
            maximumAge: 0,
          }),
      )
      if (current !== generation.current) return null
      const age = Date.now() - position.timestamp
      if (
        !Number.isFinite(age) ||
        age > 10_000 ||
        age < -5_000 ||
        position.timestamp < startedAt - 1_000
      )
        throw new Error(
          "Le GPS n'a pas fourni une position actuelle. Réessaie.",
        )
      return position
    } catch (failure) {
      if (current !== generation.current) return null
      setError(
        failure instanceof Error
          ? failure.message
          : "Position indisponible. Vérifie l'autorisation de localisation puis réessaie.",
      )
      return null
    } finally {
      if (current === generation.current) setLocating(false)
    }
  }, [])
  return { error, isLocating, requestPosition, reset }
}
