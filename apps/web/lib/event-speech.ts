"use client"

import type { GameEvent } from "@workspace/engine"

import type { Locale, Messages } from "@/lib/i18n"
import { formatGameDate } from "@/lib/format"

export const eventSpeechText = (
  event: GameEvent,
  locale: Locale,
  t: Messages
) => {
  const dateText = event.endDate
    ? `${formatGameDate(event.date, locale)} - ${formatGameDate(event.endDate, locale)}`
    : formatGameDate(event.date, locale)
  const locationText = event.location?.label
    ? locale === "fr"
      ? `Lieu: ${event.location.label}.`
      : `Location: ${event.location.label}.`
    : ""

  return [
    event.title,
    dateText,
    t.game.kinds[event.kind],
    locationText,
    event.description,
  ]
    .filter(Boolean)
    .join(". ")
}
