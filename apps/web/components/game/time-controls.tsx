"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  Calendar03Icon,
  PauseIcon,
  PlayIcon,
} from "@hugeicons/core-free-icons"

import { Spinner } from "@workspace/ui/components/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import { CountryFlag } from "@/components/country-flag"
import { GAME_SPEEDS, useGameSession, type GameSpeed } from "@/components/game/game-session"
import { useI18n } from "@/hooks/use-i18n"
import { localizedCountryName } from "@/lib/country-names"
import { formatGameDate } from "@/lib/format"

/**
 * Compact time deck, archive-style: country and date on top, the next pending
 * event, then a real-time-style clock (play/pause + speed gauge + single
 * step). Player directives live in their own panel now. Docked bottom-right.
 */
export function TimeControls() {
  const { t, locale } = useI18n()
  const {
    game,
    displayDate,
    nextScheduled,
    busy,
    error,
    completed,
    paused,
    setPaused,
    speed,
    setSpeed,
    advance,
  } = useGameSession()
  const name = localizedCountryName(game.countryCode, locale, game.countryName)

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
              {t.game.nextEventLabel}: {formatGameDate(nextScheduled.dueDate, locale)}
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
        ) : (
          <div className="mt-2.5 flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => setPaused(!paused)}
                    aria-label={paused ? t.game.play : t.game.pause}
                    aria-pressed={!paused}
                    className={cn(
                      "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors",
                      paused
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted text-foreground hover:bg-muted/70"
                    )}
                  />
                }
              >
                <HugeiconsIcon
                  icon={paused ? PlayIcon : PauseIcon}
                  strokeWidth={2.5}
                  className="size-4"
                />
              </TooltipTrigger>
              <TooltipContent>
                {paused ? t.game.play : t.game.pause}
              </TooltipContent>
            </Tooltip>

            <SpeedGauge
              value={speed}
              paused={paused}
              onChange={setSpeed}
              label={t.game.speed}
            />

            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => void advance()}
                    disabled={busy}
                    aria-label={t.game.step}
                    className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md bg-muted text-foreground transition-colors hover:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                }
              >
                {busy ? (
                  <Spinner />
                ) : (
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2.5}
                    className="size-4"
                  />
                )}
              </TooltipTrigger>
              <TooltipContent>{t.game.step}</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  )
}

function SpeedGauge({
  value,
  paused,
  onChange,
  label,
}: {
  value: GameSpeed
  paused: boolean
  onChange: (speed: GameSpeed) => void
  label: string
}) {
  return (
    <div
      className="flex h-9 flex-1 items-center justify-center gap-1 rounded-md border border-border bg-background/80 px-1.5 shadow-inner"
      role="group"
      aria-label={label}
    >
      {GAME_SPEEDS.map((level) => {
        // Fill every bar up to and including the current level.
        const filled = level <= value
        return (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            aria-label={`${label} ${level}`}
            aria-pressed={value === level}
            title={`${label} ${level}`}
            className={cn(
              "h-3.5 w-6 cursor-pointer rounded-[2px] border transition-colors",
              filled
                ? paused
                  ? "border-emerald-600 bg-emerald-500/50"
                  : "border-emerald-400 bg-emerald-500"
                : "border-border bg-muted-foreground/15 hover:bg-muted-foreground/30"
            )}
          />
        )
      })}
    </div>
  )
}
