"use client"

import type { EventEffects } from "@workspace/engine"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { AlertTriangleIcon, ChevronRightIcon } from "lucide-react"

import { useGame, useGameActions } from "@/components/game-provider"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
})

export function EventDialog() {
  const game = useGame()
  const { resolveEventChoice } = useGameActions()

  const event = game?.pendingEvent ?? null
  const open = !!event && !game?.gameOver

  if (!event || !game) {
    return (
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogContent />
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={() => {}} disablePointerDismissal>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <AlertTriangleIcon className="size-3.5" />
            <span>
              {event.category} · {dateFormatter.format(new Date(event.date))}
            </span>
          </div>
          <DialogTitle>{event.title}</DialogTitle>
          <DialogDescription className="text-sm">
            {event.description}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {event.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => resolveEventChoice(event.id, choice.id)}
              className="group grid gap-1 rounded-md border bg-card px-3 py-2.5 text-left text-sm transition-colors hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium leading-tight">
                  {choice.label}
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              {choice.description && (
                <p className="text-xs text-muted-foreground">
                  {choice.description}
                </p>
              )}
              <EffectsLine effects={choice.effects} />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EffectsLine({ effects }: { effects: EventEffects }) {
  const parts: { label: string; positive: boolean }[] = []
  if (effects.treasury)
    parts.push({
      label: `€${signed(effects.treasury)}M treasury`,
      positive: effects.treasury > 0,
    })
  if (effects.approval)
    parts.push({
      label: `${signed(effects.approval)} approval`,
      positive: effects.approval > 0,
    })
  if (effects.gdpDelta)
    parts.push({
      label: `€${signed(effects.gdpDelta)}M GDP`,
      positive: effects.gdpDelta > 0,
    })
  if (effects.unemploymentDelta)
    parts.push({
      label: `${signed(effects.unemploymentDelta)}pp unemployment`,
      positive: effects.unemploymentDelta < 0,
    })
  if (effects.inflationDelta)
    parts.push({
      label: `${signed(effects.inflationDelta)}pp inflation`,
      positive: effects.inflationDelta < 0,
    })
  if (effects.debtDelta)
    parts.push({
      label: `${signed(effects.debtDelta)}pp debt/GDP`,
      positive: effects.debtDelta < 0,
    })
  if (effects.terminal) parts.push({ label: "ends mandate", positive: true })
  if (parts.length === 0) return null
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs tabular-nums">
      {parts.map((p, i) => (
        <span
          key={i}
          className={p.positive ? "text-emerald-500" : "text-destructive"}
        >
          {p.label}
        </span>
      ))}
    </div>
  )
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`
}
