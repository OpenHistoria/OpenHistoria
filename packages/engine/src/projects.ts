export type ProjectKind =
  | "construction:nuclear"
  | "construction:industrial"
  | "construction:infrastructure"
  | "construction:military"
  | "construction:civilian"
  | "diplomacy"
  | "economic"
  | "other"

export interface ProjectLocation {
  label: string
  latitude: number
  longitude: number
}

export interface ProjectEconomics {
  upfrontCost: number
  monthlyCost: number
  completionApproval: number
  completionGdp: number
}

export interface Project extends ProjectEconomics {
  id: string
  kind: ProjectKind
  name: string
  description: string
  location: ProjectLocation
  startedAt: string
  expectedDurationDays: number
}

export interface ProjectSnapshot extends Project {}

export interface ProjectProgress {
  ratio: number
  isComplete: boolean
  expectedEndAt: Date
  elapsedDays: number
  remainingDays: number
}

const MS_PER_DAY = 86_400_000

export function getProjectProgress(
  project: Project,
  currentDate: Date
): ProjectProgress {
  const start = new Date(project.startedAt).getTime()
  const duration = Math.max(1, project.expectedDurationDays) * MS_PER_DAY
  const expectedEndAt = new Date(start + duration)
  const elapsedMs = currentDate.getTime() - start
  const elapsedDays = Math.max(0, elapsedMs / MS_PER_DAY)
  const ratio = Math.min(1, Math.max(0, elapsedMs / duration))
  const remainingDays = Math.max(
    0,
    project.expectedDurationDays - elapsedDays
  )
  return {
    ratio,
    isComplete: ratio >= 1,
    expectedEndAt,
    elapsedDays,
    remainingDays,
  }
}

interface KindEconomics {
  upfrontPerDay: number
  monthlyPerDay: number
  baseApproval: number
  gdpPerDay: number
}

const KIND_ECONOMICS: Record<ProjectKind, KindEconomics> = {
  "construction:nuclear": { upfrontPerDay: 6, monthlyPerDay: 1.2, baseApproval: 4, gdpPerDay: 8 },
  "construction:industrial": { upfrontPerDay: 2.5, monthlyPerDay: 0.6, baseApproval: 3, gdpPerDay: 5 },
  "construction:infrastructure": { upfrontPerDay: 3, monthlyPerDay: 0.4, baseApproval: 5, gdpPerDay: 4 },
  "construction:military": { upfrontPerDay: 4, monthlyPerDay: 0.8, baseApproval: 2, gdpPerDay: 1.5 },
  "construction:civilian": { upfrontPerDay: 1.8, monthlyPerDay: 0.3, baseApproval: 6, gdpPerDay: 2 },
  diplomacy: { upfrontPerDay: 0.4, monthlyPerDay: 0.05, baseApproval: 3, gdpPerDay: 0.5 },
  economic: { upfrontPerDay: 1.5, monthlyPerDay: 0.2, baseApproval: 2, gdpPerDay: 6 },
  other: { upfrontPerDay: 1, monthlyPerDay: 0.2, baseApproval: 2, gdpPerDay: 1 },
}

export function defaultProjectEconomics(
  kind: ProjectKind,
  durationDays: number
): ProjectEconomics {
  const k = KIND_ECONOMICS[kind] ?? KIND_ECONOMICS.other
  const days = Math.max(1, durationDays)
  return {
    upfrontCost: Math.round(k.upfrontPerDay * days),
    monthlyCost: Math.round(k.monthlyPerDay * days * 10) / 10,
    completionApproval: Math.round(k.baseApproval + Math.log10(days) * 1.5),
    completionGdp: Math.round(k.gdpPerDay * days),
  }
}

export function withEconomicsDefaults(
  project: Omit<Project, keyof ProjectEconomics> & Partial<ProjectEconomics>
): Project {
  const defaults = defaultProjectEconomics(project.kind, project.expectedDurationDays)
  return {
    ...project,
    upfrontCost: project.upfrontCost ?? defaults.upfrontCost,
    monthlyCost: project.monthlyCost ?? defaults.monthlyCost,
    completionApproval: project.completionApproval ?? defaults.completionApproval,
    completionGdp: project.completionGdp ?? defaults.completionGdp,
  }
}
