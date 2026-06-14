"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar03Icon, FastForwardIcon } from "@hugeicons/core-free-icons"

import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"

import { CountryFlag } from "@/components/country-flag"
import { useGameSession, type JumpSpan } from "@/components/game/game-session"
import { useI18n } from "@/hooks/use-i18n"
import { localizedCountryName } from "@/lib/country-names"
import { formatGameDate } from "@/lib/format"

/**
 * The Jump Forward deck (docked bottom-left). Time is frozen at the game's
 * current date; the player queues directives, then jumps a fixed span or
 * straight to the next major event. The world only changes on a jump.
 */
export function JumpControls() {
  const { t, locale } = useI18n()
  const { game, displayDate, nextScheduled, busy, error, completed, jump } =
    useGameSession()
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

        {error && (
          <p className="mt-2 rounded-md border border-destructive/40 bg-destructive/15 px-2 py-1.5 text-[11px] leading-snug text-destructive">
            {error}
          </p>
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
