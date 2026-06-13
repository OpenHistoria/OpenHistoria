"use client"

import { useState } from "react"

import type { GameDate, GameEvent } from "@workspace/engine"

import { Badge } from "@workspace/ui/components/badge"

import { CountryFlag } from "@/components/country-flag"
import { KIND_COLOR } from "@/components/game/event-markers"
import { useGameSession } from "@/components/game/game-session"
import { FloatingPanel } from "@/components/hud/floating-panel"
import { useI18n } from "@/hooks/use-i18n"
import { localizedCountryName } from "@/lib/country-names"
import { formatGameDate } from "@/lib/format"

const PANEL_W = 360

/** Approximate serial day count, fine for a duration ratio. */
const serial = (d: GameDate) => (d.year * 12 + (d.month - 1)) * 31 + (d.day - 1)

const initialPosition = (pos: { x: number; y: number } | null) => {
  if (typeof window === "undefined") return { x: 24, y: 96 }
  const w = PANEL_W
  const h = 340
  if (!pos) {
    return {
      x: Math.max(8, Math.round((window.innerWidth - w) / 2)),
      y: Math.max(8, Math.round((window.innerHeight - h) / 2)),
    }
  }
  // Offset off the clicked point, kept on-screen.
  return {
    x: Math.min(Math.max(8, pos.x + 16), Math.max(8, window.innerWidth - w - 8)),
    y: Math.min(Math.max(8, pos.y - 24), Math.max(8, window.innerHeight - h - 8)),
  }
}

/** Opens the full clicked event in a menu-style floating panel. */
export function EventPanel() {
  const { selectedEvent, selectedEventPos, selectEvent } = useGameSession()
  if (!selectedEvent) return null
  return (
    <EventPanelInner
      key={selectedEvent.id}
      event={selectedEvent}
      initialPos={selectedEventPos}
      onClose={() => selectEvent(null)}
    />
  )
}

function EventPanelInner({
  event,
  initialPos,
  onClose,
}: {
  event: GameEvent
  initialPos: { x: number; y: number } | null
  onClose: () => void
}) {
  const { t, locale } = useI18n()
  const { displayDate } = useGameSession()
  const [pos, setPos] = useState(() => initialPosition(initialPos))

  const color = KIND_COLOR[event.kind]
  const dateText = event.endDate
    ? `${formatGameDate(event.date, locale)} → ${formatGameDate(event.endDate, locale)}`
    : formatGameDate(event.date, locale)

  let progress = -1
  if (event.endDate) {
    const start = serial(event.date)
    const end = serial(event.endDate)
    const now = serial(displayDate)
    progress =
      end > start
        ? Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)))
        : 100
  }

  return (
    <FloatingPanel
      open
      onClose={onClose}
      position={pos}
      onPositionChange={setPos}
      title={event.title}
      icon={
        <span
          className="block size-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      }
      className="w-[360px] max-w-[90vw]"
      bodyClassName="p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="secondary"
          className="tracking-wide uppercase"
          style={{ backgroundColor: `${color}26`, color }}
        >
          {t.game.kinds[event.kind]}
        </Badge>
        <span className="text-xs text-muted-foreground tabular-nums">
          {dateText}
        </span>
      </div>

      {event.location && (
        <p className="mt-1 text-xs text-muted-foreground">
          {event.location.label}
        </p>
      )}

      {progress >= 0 && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[10px] tracking-wide text-muted-foreground uppercase">
            <span>{t.game.eventProgress}</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ width: `${progress}%`, backgroundColor: color }}
            />
          </div>
        </div>
      )}

      <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-foreground/90">
        {event.description}
      </p>

      {event.countries.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {t.game.eventCountries}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {event.countries.map((code) => (
              <CountryFlag
                key={code}
                code={code}
                title={localizedCountryName(code, locale, code)}
                tooltip
                className="h-4 w-auto rounded-[1px] ring-1 ring-border"
              />
            ))}
          </div>
        </div>
      )}
    </FloatingPanel>
  )
}
