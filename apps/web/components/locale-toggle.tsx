"use client"

import { useEffect } from "react"

import { useI18n } from "@/hooks/use-i18n"
import { LOCALES } from "@/lib/i18n"

/**
 * EN/FR switch styled like the other floating map controls. Also keeps the
 * document language attribute in sync with the detected/stored locale.
 */
export function LocaleToggle() {
  const { locale, setLocale } = useI18n()

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return (
    <div className="pointer-events-auto flex overflow-hidden rounded-md bg-black/60 text-sm font-medium text-white backdrop-blur-sm">
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-pressed={locale === option}
          onClick={() => setLocale(option)}
          className={`cursor-pointer px-2.5 py-1.5 uppercase transition-colors ${
            locale === option
              ? "bg-white/25 text-white"
              : "text-white/60 hover:text-white"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
