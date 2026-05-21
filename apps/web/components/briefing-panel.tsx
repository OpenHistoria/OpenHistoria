"use client"

import type { BriefingEntry, BriefingKind } from "@workspace/engine"
import {
  AlertTriangleIcon,
  BanknoteIcon,
  CheckCircle2Icon,
  HammerIcon,
  LandmarkIcon,
  NewspaperIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react"
import { useGame } from "@/components/game-provider"
import { useHudState } from "@/components/hud-state"

const ICONS: Record<BriefingKind, LucideIcon> = {
  event: NewspaperIcon,
  project_completed: CheckCircle2Icon,
  project_started: HammerIcon,
  project_cancelled: XCircleIcon,
  milestone: LandmarkIcon,
  warning: AlertTriangleIcon,
  treasury: BanknoteIcon,
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
})

export function BriefingPanel() {
  const game = useGame()
  const { briefingCollapsed, toggleBriefing } = useHudState()
  if (!game) return null
  const entries = game.briefing.slice(0, briefingCollapsed ? 1 : 6)

  return (
    <div className="w-80 rounded-tl-md border-t border-l bg-background/90 shadow-lg backdrop-blur-sm">
      <button
        type="button"
        onClick={toggleBriefing}
        className="flex w-full items-center justify-between border-b px-3 py-1.5 text-xs font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="Toggle briefing (B)"
      >
        <span>Briefing</span>
        <span className="text-muted-foreground">{briefingCollapsed ? "▴" : "▾"}</span>
      </button>
      {entries.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          No briefings yet.
        </p>
      ) : (
        <ul className="max-h-56 divide-y overflow-y-auto">
          {entries.map((entry) => (
            <BriefingRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  )
}

function BriefingRow({ entry }: { entry: BriefingEntry }) {
  const Icon = ICONS[entry.kind] ?? NewspaperIcon
  return (
    <li className="grid grid-cols-[auto_1fr] gap-2 px-3 py-1.5 text-xs">
      <Icon className="mt-0.5 size-3.5 text-muted-foreground" />
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-medium leading-tight">
            {entry.title}
          </span>
          <span className="shrink-0 text-muted-foreground tabular-nums">
            {dateFormatter.format(new Date(entry.date))}
          </span>
        </div>
        {entry.detail && (
          <div className="text-muted-foreground">{entry.detail}</div>
        )}
      </div>
    </li>
  )
}
