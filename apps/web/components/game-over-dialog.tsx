"use client"

import type { GameOverCause } from "@workspace/engine"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  BanknoteIcon,
  CrownIcon,
  FlagIcon,
  GavelIcon,
  type LucideIcon,
} from "lucide-react"

import { useGame, useGameActions } from "@/components/game-provider"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
})

interface CauseTheme {
  Icon: LucideIcon
  title: string
  accent: string
}

const CAUSE_THEMES: Record<Exclude<GameOverCause, undefined>, CauseTheme> = {
  election_won: {
    Icon: CrownIcon,
    title: "Legacy secured",
    accent: "text-emerald-500",
  },
  election_lost: {
    Icon: FlagIcon,
    title: "Mandate rejected",
    accent: "text-destructive",
  },
  bankruptcy: {
    Icon: BanknoteIcon,
    title: "Sovereign default",
    accent: "text-destructive",
  },
  impeachment: {
    Icon: GavelIcon,
    title: "Mandate ended by the Assembly",
    accent: "text-destructive",
  },
  other: {
    Icon: FlagIcon,
    title: "Mandate ended",
    accent: "text-destructive",
  },
}

export function GameOverDialog() {
  const game = useGame()
  const { resetGame } = useGameActions()

  if (!game?.gameOver) {
    return (
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogContent />
      </Dialog>
    )
  }

  const cause =
    game.gameOver.cause ??
    (game.gameOver.outcome === "won" ? "election_won" : "election_lost")
  const theme = CAUSE_THEMES[cause]
  const Icon = theme.Icon

  return (
    <Dialog open={true} onOpenChange={() => {}} disablePointerDismissal>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Icon className="size-3.5" />
            <span>{dateFormatter.format(new Date(game.gameOver.date))}</span>
          </div>
          <DialogTitle className={theme.accent}>{theme.title}</DialogTitle>
          <DialogDescription>{game.gameOver.reason}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat label="Final approval" value={`${game.approval.toFixed(0)}%`} />
          <Stat
            label="Treasury"
            value={`€${Math.round(game.treasury).toLocaleString()}M`}
          />
          <Stat
            label="Unemployment"
            value={`${game.stats.economy.unemploymentPct.toFixed(1)}%`}
          />
          <Stat
            label="Debt / GDP"
            value={`${game.stats.economy.publicDebtPctGdp.toFixed(0)}%`}
          />
          <Stat
            label="Decisions launched"
            value={`${game.briefing.filter((b) => b.kind === "project_started").length}`}
          />
          <Stat
            label="Events resolved"
            value={`${game.triggeredEvents.length}`}
          />
        </div>
        <DialogFooter>
          <Button onClick={() => resetGame()}>Start a new mandate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card px-2.5 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  )
}
