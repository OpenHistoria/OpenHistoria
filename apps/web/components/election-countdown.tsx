"use client"

import { evaluateReformAgenda, REFORM_AGENDAS } from "@workspace/engine"
import { cn } from "@workspace/ui/lib/utils"
import { CalendarClockIcon } from "lucide-react"

import { useGame } from "@/components/game-provider"

/**
 * Compact banner with the days remaining to the election plus a one-line
 * reform-agenda status. Lives next to the time controls so the player can
 * always see "what's the headline number right now". The election date is the
 * game's own `electionDate`, so it works for any country.
 */
export function ElectionCountdown() {
  const game = useGame()
  if (!game) return null
  if (game.gameOver) return null

  const electionMs = Date.parse(`${game.electionDate}T00:00:00.000Z`)
  const daysLeft = Math.max(
    0,
    Math.round((electionMs - game.date.getTime()) / 86_400_000)
  )
  const onTrack = evaluateReformAgenda(game)
  const agenda = game.reformAgenda
    ? REFORM_AGENDAS.find((a) => a.id === game.reformAgenda!.id)
    : null

  const urgency =
    daysLeft <= 7
      ? "border-destructive/40 bg-destructive/10"
      : daysLeft <= 30
        ? "border-amber-500/40 bg-amber-500/10"
        : "border-border bg-background/85"

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-tl-md border-t border-l px-3 py-1.5 text-xs shadow-lg backdrop-blur-sm",
        urgency
      )}
    >
      <CalendarClockIcon className="size-3.5 text-muted-foreground" />
      <div className="leading-tight">
        <div className="tabular-nums font-medium">
          {daysLeft === 0 ? "Election day" : `${daysLeft} days to election`}
        </div>
        {agenda ? (
          <div
            className={
              "text-[10px] " +
              (onTrack ? "text-emerald-500" : "text-amber-500")
            }
          >
            Agenda: {agenda.short} · {onTrack ? "on track" : "behind"}
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground">
            No agenda chosen
          </div>
        )}
      </div>
    </div>
  )
}
