"use client"

import { REFORM_AGENDAS } from "@workspace/engine"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  BanknoteIcon,
  CrownIcon,
  FlagIcon,
  GavelIcon,
  HistoryIcon,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useState } from "react"

import {
  clearRunHistory,
  loadRunHistory,
  type RunSummary,
} from "@/lib/run-history"

const CAUSE_META: Record<string, { Icon: LucideIcon; label: string; color: string }> = {
  election_won: { Icon: CrownIcon, label: "Election won", color: "text-emerald-500" },
  election_lost: { Icon: FlagIcon, label: "Election lost", color: "text-destructive" },
  bankruptcy: { Icon: BanknoteIcon, label: "Bankruptcy", color: "text-destructive" },
  impeachment: { Icon: GavelIcon, label: "Impeachment", color: "text-destructive" },
  other: { Icon: FlagIcon, label: "Other", color: "text-muted-foreground" },
}

const dateFmt = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
})

interface PastMandatesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PastMandatesDialog({
  open,
  onOpenChange,
}: PastMandatesDialogProps) {
  const [runs, setRuns] = useState<RunSummary[]>([])

  useEffect(() => {
    if (open) setRuns(loadRunHistory())
  }, [open])

  function handleClear() {
    if (!confirm("Erase all recorded mandates? This cannot be undone.")) return
    clearRunHistory()
    setRuns([])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HistoryIcon className="size-4" />
            Past mandates
            <span className="ml-1 text-sm font-normal text-muted-foreground tabular-nums">
              ({runs.length})
            </span>
          </DialogTitle>
          <DialogDescription>
            Local-only log of every game you've finished. Capped at 20 entries.
          </DialogDescription>
        </DialogHeader>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No finished mandates yet. Play through to an ending to seed this log.
          </p>
        ) : (
          <ul className="grid gap-2">
            {runs.map((r) => (
              <RunRow key={r.id} run={r} />
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={runs.length === 0}
            className="text-xs text-muted-foreground"
          >
            Clear history
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RunRow({ run }: { run: RunSummary }) {
  const meta = CAUSE_META[run.cause] ?? CAUSE_META.other!
  const Icon = meta.Icon
  const agenda = run.agendaId
    ? REFORM_AGENDAS.find((a) => a.id === run.agendaId)
    : null
  return (
    <li className="rounded-md border bg-card p-3 text-sm">
      <div className="flex items-baseline justify-between gap-2">
        <div className={"flex items-center gap-1.5 " + meta.color}>
          <Icon className="size-3.5" />
          <span className="font-medium">{meta.label}</span>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {dateFmt.format(new Date(run.endedAt))}
        </span>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
        <Stat label="Approval" value={`${run.finalApproval.toFixed(0)}%`} />
        <Stat label="Debt/GDP" value={`${run.finalDebt.toFixed(0)}%`} />
        <Stat
          label="Unemployment"
          value={`${run.finalUnemployment.toFixed(1)}%`}
        />
        <Stat
          label="Treasury"
          value={`€${run.finalTreasury.toLocaleString()}M`}
        />
        <Stat label="Projects done" value={`${run.completedProjects}`} />
        <Stat label="Events resolved" value={`${run.triggeredEvents}`} />
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-muted-foreground">
        {agenda ? <span>Agenda: {agenda.short}</span> : null}
        {run.allies.length > 0 ? (
          <span>Allies: {run.allies.join(", ")}</span>
        ) : null}
        <span>
          Ended in-game {dateFmt.format(new Date(run.inGameEndedAt))}
        </span>
      </div>
    </li>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
