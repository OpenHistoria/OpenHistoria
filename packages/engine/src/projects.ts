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

export interface Project {
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
