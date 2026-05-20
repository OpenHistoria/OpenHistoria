"use client"

import {
  getProjectProgress,
  type Project,
  type ProjectKind,
  type ProjectProgress,
} from "@workspace/engine"
import {
  MapMarker,
  MapPopup,
  MapTooltip,
} from "@workspace/ui/components/map"
import {
  AtomIcon,
  BuildingIcon,
  CheckIcon,
  FactoryIcon,
  HandshakeIcon,
  LandmarkIcon,
  MapPinIcon,
  RouteIcon,
  ShieldIcon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react"

import { useGame } from "@/components/game-provider"

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

const KIND_LABELS: Record<ProjectKind, string> = {
  "construction:nuclear": "Nuclear",
  "construction:industrial": "Industry",
  "construction:infrastructure": "Infrastructure",
  "construction:military": "Military",
  "construction:civilian": "Civilian",
  diplomacy: "Diplomacy",
  economic: "Economy",
  other: "Other",
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
})

function formatRemaining(days: number): string {
  if (days <= 0) return "—"
  if (days < 60) return `${Math.round(days)} day${days >= 1.5 ? "s" : ""}`
  const months = days / 30
  if (months < 24) return `${months.toFixed(1)} months`
  return `${(days / 365).toFixed(1)} years`
}

export function ProjectMarkers() {
  const game = useGame()
  if (!game) return null

  return (
    <>
      {game.projects.map((project) => (
        <ProjectMarker
          key={project.id}
          project={project}
          progress={getProjectProgress(project, game.date)}
        />
      ))}
    </>
  )
}

function ProjectMarker({
  project,
  progress,
}: {
  project: Project
  progress: ProjectProgress
}) {
  const Icon = PROJECT_ICONS[project.kind] ?? MapPinIcon
  const pct = Math.round(progress.ratio * 100)

  return (
    <MapMarker
      position={[project.location.latitude, project.location.longitude]}
      icon={<MarkerIcon icon={Icon} progress={progress} />}
      iconAnchor={[16, 16]}
    >
      <MapTooltip>{project.name}</MapTooltip>
      <MapPopup>
        <div className="grid gap-2">
          <div>
            <div className="text-xs text-muted-foreground">
              {KIND_LABELS[project.kind] ?? project.kind} ·{" "}
              {project.location.label}
            </div>
            <div className="font-semibold leading-tight">{project.name}</div>
          </div>
          <p className="text-xs leading-snug text-muted-foreground">
            {project.description}
          </p>
          <div className="grid gap-1">
            <div className="flex items-center justify-between text-xs tabular-nums">
              <span className="text-muted-foreground">
                {progress.isComplete ? "Complete" : `${pct}%`}
              </span>
              <span className="text-muted-foreground">
                {progress.isComplete
                  ? `Finished ${dateFormatter.format(progress.expectedEndAt)}`
                  : `ETA ${dateFormatter.format(progress.expectedEndAt)} · ${formatRemaining(progress.remainingDays)}`}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={
                  progress.isComplete
                    ? "h-full bg-emerald-500"
                    : "h-full bg-primary"
                }
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </MapPopup>
    </MapMarker>
  )
}

function MarkerIcon({
  icon: Icon,
  progress,
}: {
  icon: LucideIcon
  progress: ProjectProgress
}) {
  const radius = 14
  const stroke = 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress.ratio)

  return (
    <div className="relative size-8">
      <svg
        viewBox="0 0 32 32"
        className="absolute inset-0 size-full -rotate-90"
        aria-hidden
      >
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth={stroke}
        />
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          stroke={progress.isComplete ? "#10b981" : "#3b82f6"}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div
        className={
          progress.isComplete
            ? "absolute inset-1 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-md"
            : "absolute inset-1 flex items-center justify-center rounded-full bg-background text-foreground shadow-md"
        }
      >
        {progress.isComplete ? (
          <CheckIcon className="size-3.5" />
        ) : (
          <Icon className="size-3.5" />
        )}
      </div>
    </div>
  )
}
