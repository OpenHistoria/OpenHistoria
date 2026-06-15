"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Calendar03Icon,
  FastForwardIcon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"

import type { GameDate, GameEvent } from "@workspace/engine"

import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"

import { CountryFlag } from "@/components/country-flag"
import { useGameSession, type JumpSpan } from "@/components/game/game-session"
import { useI18n } from "@/hooks/use-i18n"
import { localizedCountryName } from "@/lib/country-names"
import { formatGameDate } from "@/lib/format"

/**
 * The Jump Forward deck (docked bottom-left). The player can manually jump a
 * fixed span or let autoplay keep issuing quiet one-month turns while idle.
 */
export function JumpControls() {
  const { t, locale } = useI18n()
  const {
    game,
    displayDate,
    nextScheduled,
    busy,
    error,
    events,
    completed,
    jump,
    retryLastJump,
    canRetryJump,
    autoPlay,
    setAutoPlay,
  } = useGameSession()
  const name = localizedCountryName(game.countryCode, locale, game.countryName)

  const spans: { label: string; span: JumpSpan }[] = [
    { label: t.game.jumpWeek, span: { kind: "days", days: 7 } },
    { label: t.game.jumpMonth, span: { kind: "months", months: 1 } },
    { label: t.game.jump3Months, span: { kind: "months", months: 3 } },
    { label: t.game.jump6Months, span: { kind: "months", months: 6 } },
    { label: t.game.jumpYear, span: { kind: "months", months: 12 } },
  ]

  return (
    <div className="w-[min(86vw,300px)] rounded-xl border border-border bg-popover/80 text-popover-foreground shadow-2xl ring-1 ring-border backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <CountryFlag
          code={game.countryCode}
          title={name}
          tooltip
          className="h-4 w-auto rounded-[1px] ring-1 ring-black/30"
        />
        <span className="truncate text-xs font-semibold">{name}</span>
      </div>

      <div className="px-3 py-2.5">
        <div className="text-center text-sm font-semibold tabular-nums">
          {formatGameDate(displayDate, locale)}
        </div>
        {nextScheduled && !completed && (
          <div
            className="mt-1 flex items-center justify-center gap-1 text-[10px] tracking-wide text-muted-foreground uppercase"
            title={nextScheduled.title}
          >
            <HugeiconsIcon
              icon={Calendar03Icon}
              strokeWidth={2}
              className="size-3 shrink-0"
            />
            <span className="truncate">
              {t.game.nextEventLabel}:{" "}
              {formatGameDate(nextScheduled.dueDate, locale)}
            </span>
          </div>
        )}

        <EconomyPulse
          date={displayDate}
          events={events}
          labels={t.game.economyMetrics}
          title={t.game.economyTitle}
          empty={t.game.economyEmpty}
        />

        {error && (
          <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/15 px-2 py-1.5 text-destructive">
            <p className="text-[11px] leading-snug">{error}</p>
            {canRetryJump && (
              <button
                type="button"
                onClick={() => void retryLastJump()}
                disabled={busy}
                className="mt-1.5 flex cursor-pointer items-center gap-1 text-[11px] font-semibold underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                <HugeiconsIcon
                  icon={RefreshIcon}
                  strokeWidth={2.5}
                  className="size-3"
                />
                {t.game.retry}
              </button>
            )}
          </div>
        )}

        {completed ? (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {t.game.completedNote}
          </p>
        ) : busy ? (
          <div className="mt-3 flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
            <Spinner />
            {t.game.jumping}
          </div>
        ) : (
          <div className="mt-2.5">
            <div className="mb-2 grid grid-cols-[1fr_auto] gap-1.5">
              <button
                type="button"
                onClick={() => setAutoPlay(!autoPlay)}
                aria-pressed={autoPlay}
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2",
                  "text-sm font-semibold transition-colors",
                  autoPlay
                    ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border-border bg-background/80 hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <HugeiconsIcon
                  icon={autoPlay ? PauseIcon : PlayIcon}
                  strokeWidth={2.5}
                  className="size-4"
                />
                {autoPlay ? t.game.pause : t.game.play}
              </button>
              <button
                type="button"
                onClick={() => void jump({ kind: "months", months: 1 })}
                title={t.game.step}
                className="flex size-10 cursor-pointer items-center justify-center rounded-md border border-border bg-background/80 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <HugeiconsIcon
                  icon={FastForwardIcon}
                  strokeWidth={2.5}
                  className="size-4"
                />
              </button>
            </div>
            <p className="mb-1.5 text-[10px] tracking-wide text-muted-foreground uppercase">
              {t.game.jumpTitle}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {spans.map(({ label, span }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => void jump(span)}
                  className="cursor-pointer rounded-md border border-border bg-background/80 px-1 py-1.5 text-xs font-medium tabular-nums transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void jump({ kind: "auto" })}
              title={t.game.jumpNextEventHint}
              className={cn(
                "mt-1.5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-3 py-2",
                "text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              )}
            >
              <HugeiconsIcon
                icon={FastForwardIcon}
                strokeWidth={2.5}
                className="size-4"
              />
              {t.game.jumpNextEvent}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function EconomyPulse({
  date,
  events,
  labels,
  title,
  empty,
}: {
  date: GameDate
  events: GameEvent[]
  labels: { market: string; stability: string; supply: string }
  title: string
  empty: string
}) {
  const pulse = calculateEconomyPulse(date, events)
  const metrics = [
    { key: "market", label: labels.market, value: pulse.market },
    { key: "stability", label: labels.stability, value: pulse.stability },
    { key: "supply", label: labels.supply, value: pulse.supply },
  ] as const

  return (
    <div className="mt-2.5 rounded-md border border-border bg-muted/35 px-2.5 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h3>
        {events.length === 0 && (
          <span className="text-[10px] text-muted-foreground">{empty}</span>
        )}
      </div>
      <div className="grid gap-1.5">
        {metrics.map((metric) => (
          <div
            key={metric.key}
            className="grid grid-cols-[5rem_1fr_2rem] items-center gap-2"
          >
            <span className="truncate text-[10px] text-muted-foreground">
              {metric.label}
            </span>
            <div className="h-1.5 overflow-hidden rounded-full bg-background/80">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${metric.value}%` }}
              />
            </div>
            <span className="text-right text-[10px] font-medium tabular-nums">
              {metric.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const clampPulse = (value: number) =>
  Math.max(8, Math.min(92, Math.round(value)))

function calculateEconomyPulse(date: GameDate, events: GameEvent[]) {
  const currentSerial = date.year * 372 + (date.month - 1) * 31 + date.day
  const seasonal = ((date.month * 11 + date.day * 3) % 13) - 6
  const recent = events
    .map((event) => ({
      event,
      age: Math.max(
        0,
        currentSerial -
          (event.date.year * 372 + (event.date.month - 1) * 31 + event.date.day)
      ),
    }))
    .filter(({ age }) => age <= 372)
    .slice(-18)

  let market = 52 + seasonal
  let stability = 55 - seasonal / 2
  let supply = 54 + seasonal / 3

  for (const { event, age } of recent) {
    const weight = Math.max(0.2, 1 - age / 372) * event.importance
    switch (event.kind) {
      case "economic":
        market += weight * 4
        supply += weight * 2
        break
      case "scientific":
        market += weight * 2.4
        supply += weight * 1.2
        break
      case "diplomatic":
        market += weight * 1.5
        stability += weight * 1.7
        break
      case "social":
        stability += weight * 2
        break
      case "political":
        stability += weight * 0.8
        break
      case "military":
        market -= weight * 2.4
        stability -= weight * 3
        supply -= weight * 2.8
        break
      case "disaster":
        market -= weight * 3
        stability -= weight * 2
        supply -= weight * 3.4
        break
    }
  }

  return {
    market: clampPulse(market),
    stability: clampPulse(stability),
    supply: clampPulse(supply),
  }
}
