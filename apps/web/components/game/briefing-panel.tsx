"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { News01Icon } from "@hugeicons/core-free-icons"

import type { EventKind } from "@workspace/engine"

import { useGameSession } from "@/components/game/game-session"
import { FloatingPanel } from "@/components/hud/floating-panel"
import { useI18n } from "@/hooks/use-i18n"
import { formatGameDate } from "@/lib/format"

/** Left border accent per event kind, so the feed scans at a glance. */
const KIND_ACCENT: Record<EventKind, string> = {
  political: "border-l-sky-400",
  military: "border-l-red-400",
  economic: "border-l-amber-400",
  diplomatic: "border-l-violet-400",
  social: "border-l-emerald-400",
  scientific: "border-l-cyan-400",
  disaster: "border-l-orange-500",
}

/** Draggable panel holding the latest narration and the event timeline. */
export function BriefingPanel({
  open,
  onClose,
  position,
  onPositionChange,
}: {
  open: boolean
  onClose: () => void
  position: { x: number; y: number }
  onPositionChange: (pos: { x: number; y: number }) => void
}) {
  const { t, locale } = useI18n()
  const { events, narration } = useGameSession()
  const feed = [...events].reverse()

  return (
    <FloatingPanel
      open={open}
      onClose={onClose}
      position={position}
      onPositionChange={onPositionChange}
      title={t.game.briefingTitle}
      icon={
        <HugeiconsIcon icon={News01Icon} strokeWidth={2} className="size-4" />
      }
      className="h-[min(70vh,560px)] w-[360px] max-w-[90vw]"
      bodyClassName="p-4"
    >
      {narration && (
        <section className="mb-4 rounded-md bg-muted/50 p-3">
          <h3 className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {t.game.narrationHeading}
          </h3>
          <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
            {narration}
          </p>
        </section>
      )}

      {feed.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t.game.emptyFeed}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {feed.map((event) => (
            <li
              key={event.id}
              className={`rounded-md rounded-l-none border border-border border-l-2 bg-muted/60 px-3 py-2 ${KIND_ACCENT[event.kind]}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{event.title}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                  {event.endDate
                    ? `${formatGameDate(event.date, locale)} → ${formatGameDate(event.endDate, locale)}`
                    : formatGameDate(event.date, locale)}
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {event.description}
              </p>
              <span className="mt-1 inline-block text-[10px] tracking-wide text-muted-foreground uppercase">
                {t.game.kinds[event.kind]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </FloatingPanel>
  )
}
