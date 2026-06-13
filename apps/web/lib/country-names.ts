import { Result } from "better-result"

import type { Locale } from "@/lib/i18n"

/**
 * Localized country names from ISO 3166-1 alpha-2 codes, via the platform's
 * Intl.DisplayNames data. This keeps country labels (picker, selected row,
 * map hover, map country labels) translated with zero translation tables to
 * maintain: the same code resolves to the right name in every supported
 * locale.
 */

// Intl.DisplayNames instances are reusable; build one per locale on demand.
const cache = new Map<Locale, Intl.DisplayNames>()

const displayNames = (locale: Locale): Intl.DisplayNames => {
  const hit = cache.get(locale)
  if (hit) return hit
  const dn = new Intl.DisplayNames([locale], { type: "region" })
  cache.set(locale, dn)
  return dn
}

/**
 * Localized name for an ISO alpha-2 code, or null when the code is malformed
 * or has no localized name. .of() throws RangeError on malformed input and
 * echoes the input back for well-formed but unknown codes, so both are
 * treated as "no name".
 */
export function countryNameOrNull(
  code: string | null | undefined,
  locale: Locale
): string | null {
  const key = code?.trim().toUpperCase()
  if (!key || key.length !== 2) return null
  const name = Result.try(() => displayNames(locale).of(key)).unwrapOr(undefined)
  return name && name !== key ? name : null
}

/**
 * Localized country name, falling back to the given name (e.g. the English
 * roster name) and finally the bare code.
 */
export function localizedCountryName(
  code: string | null | undefined,
  locale: Locale,
  fallback?: string
): string {
  return (
    countryNameOrNull(code, locale) ??
    fallback ??
    code?.trim().toUpperCase() ??
    ""
  )
}
