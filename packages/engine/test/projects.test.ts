import { describe, expect, it } from "vitest"

import {
  defaultProjectEconomics,
  getProjectProgress,
  withEconomicsDefaults,
  type Project,
  type ProjectKind,
} from "../src/projects"

function baseProject(): Omit<Project, keyof ReturnType<typeof defaultProjectEconomics>> {
  return {
    id: "p1",
    kind: "construction:civilian",
    name: "Lyon library",
    description: "",
    location: { label: "Lyon", latitude: 45.75, longitude: 4.85 },
    startedAt: "2026-05-21T00:00:00.000Z",
    expectedDurationDays: 60,
  }
}

describe("defaultProjectEconomics", () => {
  it("scales upfront cost with duration", () => {
    const short = defaultProjectEconomics("construction:nuclear", 365)
    const long = defaultProjectEconomics("construction:nuclear", 3650)
    expect(long.upfrontCost).toBeGreaterThan(short.upfrontCost * 9)
  })

  it("varies cost by kind", () => {
    const nuclear = defaultProjectEconomics("construction:nuclear", 365)
    const civilian = defaultProjectEconomics("construction:civilian", 365)
    expect(nuclear.upfrontCost).toBeGreaterThan(civilian.upfrontCost)
  })

  it("falls back to 'other' for unknown kinds", () => {
    const other = defaultProjectEconomics("other", 30)
    const unknown = defaultProjectEconomics(
      "fake-kind" as unknown as ProjectKind,
      30
    )
    expect(unknown).toEqual(other)
  })
})

describe("withEconomicsDefaults", () => {
  it("fills in missing economics", () => {
    const project = withEconomicsDefaults(baseProject())
    expect(project.upfrontCost).toBeGreaterThan(0)
    expect(project.completionApproval).toBeGreaterThan(0)
  })

  it("preserves user-provided values", () => {
    const project = withEconomicsDefaults({
      ...baseProject(),
      upfrontCost: 999,
    })
    expect(project.upfrontCost).toBe(999)
  })
})

describe("getProjectProgress", () => {
  const project = withEconomicsDefaults({
    ...baseProject(),
    expectedDurationDays: 10,
  })

  it("clamps to 0 for future-dated projects", () => {
    const earlier = new Date("2026-05-20T00:00:00.000Z")
    const progress = getProjectProgress(
      { ...project, startedAt: "2026-05-21T00:00:00.000Z" },
      earlier
    )
    expect(progress.ratio).toBe(0)
    expect(progress.elapsedDays).toBe(0)
    expect(progress.isComplete).toBe(false)
  })

  it("reports ratio between 0 and 1 mid-project", () => {
    const mid = new Date("2026-05-26T00:00:00.000Z")
    const progress = getProjectProgress(
      { ...project, startedAt: "2026-05-21T00:00:00.000Z" },
      mid
    )
    expect(progress.ratio).toBeGreaterThan(0)
    expect(progress.ratio).toBeLessThan(1)
  })

  it("clamps to 1 after duration elapsed", () => {
    const later = new Date("2026-06-21T00:00:00.000Z")
    const progress = getProjectProgress(
      { ...project, startedAt: "2026-05-21T00:00:00.000Z" },
      later
    )
    expect(progress.ratio).toBe(1)
    expect(progress.isComplete).toBe(true)
  })
})
