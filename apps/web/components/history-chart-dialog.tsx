"use client"

import type { HistorySample } from "@workspace/engine"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { LineChartIcon } from "lucide-react"

import { useGame } from "@/components/game-provider"

interface HistoryChartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Series {
  label: string
  color: string
  accessor: (s: HistorySample) => number
  format: (v: number) => string
}

const SERIES: Series[] = [
  {
    label: "Approval",
    color: "stroke-emerald-500",
    accessor: (s) => s.approval,
    format: (v) => `${v.toFixed(0)}%`,
  },
  {
    label: "Treasury",
    color: "stroke-amber-500",
    accessor: (s) => s.treasury,
    format: (v) => `€${Math.round(v).toLocaleString()}M`,
  },
  {
    label: "GDP",
    color: "stroke-primary",
    accessor: (s) => s.gdpUsd,
    format: (v) => `€${(v / 1_000_000_000_000).toFixed(2)}T`,
  },
  {
    label: "Unemployment",
    color: "stroke-destructive",
    accessor: (s) => s.unemploymentPct,
    format: (v) => `${v.toFixed(1)}%`,
  },
]

const WIDTH = 640
const HEIGHT = 160
const PADDING = 8

export function HistoryChartDialog({
  open,
  onOpenChange,
}: HistoryChartDialogProps) {
  const game = useGame()
  const samples = game?.history ?? []
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LineChartIcon className="size-4" />
            History
          </DialogTitle>
          <DialogDescription>
            Weekly samples of treasury, approval, GDP, and unemployment since
            the start of your mandate.
          </DialogDescription>
        </DialogHeader>
        {samples.length < 2 ? (
          <p className="text-sm text-muted-foreground">
            Not enough samples yet — let a few weeks elapse and reopen.
          </p>
        ) : (
          <div className="grid gap-3">
            {SERIES.map((s) => (
              <ChartRow key={s.label} series={s} samples={samples} />
            ))}
          </div>
        )}
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ChartRow({
  series,
  samples,
}: {
  series: Series
  samples: readonly HistorySample[]
}) {
  const values = samples.map(series.accessor)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const first = values[0]!
  const last = values[values.length - 1]!
  const delta = last - first
  const stepX =
    values.length > 1 ? (WIDTH - PADDING * 2) / (values.length - 1) : 0
  const points = values
    .map((v, i) => {
      const x = PADDING + i * stepX
      const y =
        PADDING + (HEIGHT - PADDING * 2) - ((v - min) / range) * (HEIGHT - PADDING * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium">{series.label}</span>
        <span className="tabular-nums text-muted-foreground">
          {series.format(first)} → {series.format(last)}{" "}
          <span
            className={delta >= 0 ? "text-emerald-500" : "text-destructive"}
          >
            ({delta >= 0 ? "+" : ""}
            {series.format(delta).replace(/^€?/, "")})
          </span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-1 h-32 w-full rounded-sm border bg-muted/30"
        preserveAspectRatio="none"
        aria-label={`${series.label} over time`}
      >
        <polyline
          fill="none"
          points={points}
          strokeWidth={1.5}
          className={series.color}
        />
      </svg>
    </div>
  )
}
