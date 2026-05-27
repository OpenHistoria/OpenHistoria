"use client"

import { LOBBIES, type LobbyId } from "@workspace/engine"
import { cn } from "@workspace/ui/lib/utils"
import { UsersRoundIcon } from "lucide-react"

import { useGame } from "@/components/game-provider"
import { MiniSparkline } from "@/components/mini-sparkline"

/**
 * Compact widget showing each interest group's satisfaction as a coloured
 * pip. Lives inside the country-stats panel.
 */
export function LobbyBar() {
  const game = useGame()
  if (!game) return null
  // Build per-lobby trend series from the weekly history.
  const trends: Record<LobbyId, number[]> = {
    unions: [],
    industry: [],
    ecology: [],
    military: [],
    public_sector: [],
  }
  for (const sample of game.history) {
    if (!sample.lobbies) continue
    for (const id of Object.keys(trends) as LobbyId[]) {
      const v = sample.lobbies[id]
      if (typeof v === "number") trends[id].push(v)
    }
  }
  return (
    <div className="text-xs">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <UsersRoundIcon className="size-3" />
        <span>Lobby groups</span>
      </div>
      <ul className="grid gap-1">
        {LOBBIES.map((lobby) => {
          const sat = game.lobbies[lobby.id] ?? 50
          const series = trends[lobby.id]
          return (
            <li
              key={lobby.id}
              className="grid grid-cols-[1fr_auto_auto] items-baseline gap-2"
              title={lobby.blurb}
            >
              <div className="min-w-0">
                <div className="text-[11px] font-medium leading-tight">
                  {lobby.label}
                </div>
                <div className="relative mt-0.5 h-1 w-full rounded-full bg-muted">
                  <div
                    className={cn("absolute top-0 left-0 h-1 rounded-full", barColor(sat))}
                    style={{ width: `${sat}%` }}
                  />
                </div>
              </div>
              <span className={"text-[10px] tabular-nums " + textColor(sat)}>
                {Math.round(sat)}
              </span>
              <MiniSparkline
                values={series}
                min={0}
                max={100}
                width={36}
                height={12}
                className={"shrink-0 " + textColor(sat)}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function barColor(sat: number): string {
  if (sat >= 75) return "bg-emerald-500"
  if (sat <= 25) return "bg-destructive"
  return "bg-amber-500/70"
}

function textColor(sat: number): string {
  if (sat >= 75) return "text-emerald-500"
  if (sat <= 25) return "text-destructive"
  return "text-muted-foreground"
}
