import type { GameDate } from "@workspace/engine"

import type { Locale } from "@/lib/i18n"

const cache = new Map<Locale, Intl.DateTimeFormat>()

const dayMonthYear = (locale: Locale): Intl.DateTimeFormat => {
  const hit = cache.get(locale)
  if (hit) return hit
  const fmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
  cache.set(locale, fmt)
  return fmt
}

/** Localized full date for an in-game date (e.g. "14 janvier 1850"). */
export function formatGameDate(date: GameDate, locale: Locale): string {
  // Build the date in UTC so the day never shifts across time zones; game
  // years are >= 1800, safely clear of the Date two-digit-year remapping.
  return dayMonthYear(locale).format(
    Date.UTC(date.year, date.month - 1, date.day)
  )
}
