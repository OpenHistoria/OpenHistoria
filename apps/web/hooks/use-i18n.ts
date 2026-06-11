"use client"

import { useSyncExternalStore } from "react"

import {
  MESSAGES,
  getLocale,
  setLocale,
  subscribeToLocale,
  type Locale,
  type Messages,
} from "@/lib/i18n"

export interface I18n {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Messages
}

// The browser language is unreadable during SSR; render English first and
// let hydration swap in the real locale.
const getServerLocale = (): Locale => "en"

export function useI18n(): I18n {
  const locale = useSyncExternalStore(
    subscribeToLocale,
    getLocale,
    getServerLocale
  )
  return { locale, setLocale, t: MESSAGES[locale] }
}
