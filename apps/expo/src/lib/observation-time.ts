/** Interpret a time explicitly labelled “today” in the phone's local timezone. */
export function observationTime(value: string, now: number): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null
  const observed = new Date(now)
  observed.setHours(Number(match[1]), Number(match[2]), 0, 0)
  return observed.getTime() <= now ? observed.getTime() : null
}
