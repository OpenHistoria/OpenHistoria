"use client"

import {
  defaultProjectEconomics,
  getProjectProgress,
  type Project,
  type ProjectKind,
  type ProjectLocation,
} from "@workspace/engine"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  AtomIcon,
  BuildingIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  ClockIcon,
  CrownIcon,
  FactoryIcon,
  HandshakeIcon,
  LandmarkIcon,
  Loader2Icon,
  MapPinIcon,
  RouteIcon,
  ShieldIcon,
  TrendingUpIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"
import { useMemo, useState } from "react"

import { FloatingPanel } from "@/components/floating-panel"
import { useGame, useGameActions } from "@/components/game-provider"
import { useHudState } from "@/components/hud-state"

interface DecideResponse {
  name: string
  kind: ProjectKind
  description: string
  expectedDurationDays: number
  location: ProjectLocation
}

const PROJECT_ICONS: Record<ProjectKind, LucideIcon> = {
  "construction:nuclear": AtomIcon,
  "construction:industrial": FactoryIcon,
  "construction:infrastructure": RouteIcon,
  "construction:military": ShieldIcon,
  "construction:civilian": BuildingIcon,
  diplomacy: HandshakeIcon,
  economic: TrendingUpIcon,
  other: LandmarkIcon,
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
})

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `proj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function toDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function DecisionsPanel() {
  const game = useGame()
  const { addProject, removeProject } = useGameActions()
  const {
    decisionsOpen,
    closeDecisions,
    decisionsPos,
    setDecisionsPos,
  } = useHudState()
  const [prompt, setPrompt] = useState("")
  const [startDate, setStartDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const todayIso = game ? toDateInputValue(game.date) : ""
  const effectiveStartDate = startDate || todayIso
  const projects = useMemo(() => game?.projects ?? [], [game?.projects])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!game) return
    const trimmed = prompt.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/decide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          context: {
            nation: game.nation,
            date: game.date.toISOString(),
          },
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(
          typeof body?.error === "string" ? body.error : `HTTP ${res.status}`
        )
      }

      const data = (await res.json()) as DecideResponse
      const start = startDate
        ? new Date(`${startDate}T00:00:00`)
        : game.date
      const economics = defaultProjectEconomics(
        data.kind,
        data.expectedDurationDays
      )
      if (game.treasury < economics.upfrontCost) {
        throw new Error(
          `Treasury short by €${(economics.upfrontCost - game.treasury).toFixed(0)}M. Cut spending or pick a smaller project.`
        )
      }
      const project: Project = {
        id: newId(),
        kind: data.kind,
        name: data.name,
        description: data.description,
        expectedDurationDays: data.expectedDurationDays,
        location: data.location,
        startedAt: start.toISOString(),
        ...economics,
      }
      addProject(project)
      setPrompt("")
      setStartDate("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  if (!game) return null

  return (
    <FloatingPanel
      open={decisionsOpen}
      onClose={closeDecisions}
      title="Presidential Decisions"
      icon={<CrownIcon className="size-4" />}
      position={decisionsPos}
      onPositionChange={setDecisionsPos}
      className="h-[560px] w-[820px] max-w-[95vw]"
      bodyClassName="bg-background/95"
    >
      <div className="grid h-full grid-cols-[1fr_1fr] divide-x divide-border/80">
        <section className="flex min-h-0 flex-col">
          <header className="border-b border-border/80 bg-muted/40 px-4 py-2">
            <h3 className="font-semibold text-sm tracking-wide uppercase">
              Active decisions
            </h3>
            <p className="text-muted-foreground text-xs">
              Ongoing, scheduled, and completed initiatives.
            </p>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {projects.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No decisions yet. Use the form to schedule one.
              </p>
            ) : (
              <ul className="grid gap-2">
                {projects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    currentDate={game.date}
                    onRemove={() => removeProject(project.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col">
          <header className="border-b border-border/80 bg-muted/40 px-4 py-2">
            <h3 className="font-semibold text-sm tracking-wide uppercase">
              New decision
            </h3>
            <p className="text-muted-foreground text-xs">
              Describe an initiative — the AI drafts cost and duration.
            </p>
          </header>
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="decision-prompt">Initiative</Label>
              <Textarea
                id="decision-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g. launch a nuclear power plant construction project in Calais"
                rows={4}
                disabled={loading}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="decision-start-date">Start date</Label>
              <Input
                id="decision-start-date"
                type="date"
                value={effectiveStartDate}
                min={todayIso}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={loading}
                className="w-fit"
              />
              <p className="text-muted-foreground text-xs">
                Defaults to today. Pick a future date to schedule for later.
              </p>
            </div>
            <div className="rounded border border-border/60 bg-muted/30 px-3 py-2 text-xs tabular-nums">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Treasury</span>
                <span className="font-medium">
                  €{Math.round(game.treasury).toLocaleString()}M
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">
                Costs are derived from project type and duration after the AI
                drafts the proposal.
              </p>
            </div>
            {error && (
              <p className="text-destructive text-xs" role="alert">
                {error}
              </p>
            )}
            <div className="mt-auto flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={closeDecisions}
                disabled={loading}
              >
                Close
              </Button>
              <Button type="submit" disabled={loading || !prompt.trim()}>
                {loading && <Loader2Icon className="animate-spin" />}
                Schedule
              </Button>
            </div>
          </form>
        </section>
      </div>
    </FloatingPanel>
  )
}

function ProjectRow({
  project,
  currentDate,
  onRemove,
}: {
  project: Project
  currentDate: Date
  onRemove: () => void
}) {
  const Icon = PROJECT_ICONS[project.kind] ?? MapPinIcon
  const progress = getProjectProgress(project, currentDate)
  const startedAt = new Date(project.startedAt)
  const isScheduled = startedAt.getTime() > currentDate.getTime()
  const pct = Math.round(progress.ratio * 100)

  let StatusIcon: LucideIcon = ClockIcon
  let statusLabel: string
  if (isScheduled) {
    StatusIcon = CalendarClockIcon
    statusLabel = `Starts ${dateFormatter.format(startedAt)}`
  } else if (progress.isComplete) {
    StatusIcon = CheckCircle2Icon
    statusLabel = `Completed ${dateFormatter.format(progress.expectedEndAt)}`
  } else {
    statusLabel = `${pct}% · ETA ${dateFormatter.format(progress.expectedEndAt)}`
  }

  return (
    <li className="flex items-start gap-2 rounded-md border border-border/60 bg-card/80 px-3 py-2 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium leading-tight">{project.name}</div>
        <div className="mt-0.5 flex items-center gap-1 text-muted-foreground text-xs">
          <StatusIcon className="size-3" />
          <span className="truncate">
            {statusLabel} · {project.location.label}
          </span>
        </div>
        {!isScheduled && !progress.isComplete && (
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary/80"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        <div className="mt-1 text-muted-foreground text-xs tabular-nums">
          €{project.upfrontCost}M upfront · €{project.monthlyCost.toFixed(1)}M/mo
          · +{project.completionApproval} approval on complete
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={`Cancel ${project.name}`}
        title="Cancel"
        onClick={onRemove}
      >
        <XIcon className="size-4" />
      </Button>
    </li>
  )
}
