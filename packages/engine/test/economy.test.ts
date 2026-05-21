import { describe, expect, it } from "vitest"

import { CountryStatsProvider } from "../src/country-stats"
import { applyEconomyTick, getCashflow } from "../src/economy"
import {
  defaultProjectEconomics,
  type Project,
  type ProjectKind,
} from "../src/projects"

const provider = new CountryStatsProvider()

function projectWithCost(kind: ProjectKind, days: number): Project {
  return {
    id: `p-${kind}`,
    kind,
    name: kind,
    description: "",
    location: { label: "Paris", latitude: 48.85, longitude: 2.35 },
    startedAt: "2026-05-21T00:00:00.000Z",
    expectedDurationDays: days,
    ...defaultProjectEconomics(kind, days),
  }
}

describe("getCashflow", () => {
  it("returns positive baseline with no projects", () => {
    const stats = provider.fetchSync("FR")
    const cashflow = getCashflow(stats, [])
    expect(cashflow.annualRevenue).toBeGreaterThan(0)
    expect(cashflow.annualExpenses).toBeGreaterThan(0)
    expect(cashflow.projectMonthlyCost).toBe(0)
  })

  it("adds monthly project cost to expenses", () => {
    const stats = provider.fetchSync("FR")
    const base = getCashflow(stats, [])
    const project = projectWithCost("construction:nuclear", 365)
    const withProject = getCashflow(stats, [project])
    expect(withProject.projectMonthlyCost).toBeCloseTo(project.monthlyCost, 5)
    expect(withProject.annualExpenses).toBeGreaterThan(base.annualExpenses)
  })
})

describe("applyEconomyTick", () => {
  it("is a no-op for zero days", () => {
    const stats = provider.fetchSync("FR")
    const result = applyEconomyTick(
      { date: new Date(), treasury: 0, approval: 50, stats, projects: [] },
      0
    )
    expect(result.treasury).toBe(0)
    expect(result.approval).toBe(50)
    expect(result.stats).toBe(stats)
  })

  it("moves treasury and drifts approval toward baseline", () => {
    const stats = provider.fetchSync("FR")
    const result = applyEconomyTick(
      { date: new Date(), treasury: 0, approval: 80, stats, projects: [] },
      30
    )
    expect(result.approval).toBeLessThan(80)
    expect(result.approval).toBeGreaterThan(34)
  })

  it("penalises approval when treasury is deeply negative", () => {
    const stats = provider.fetchSync("FR")
    const a = applyEconomyTick(
      { date: new Date(), treasury: 0, approval: 50, stats, projects: [] },
      10
    )
    const b = applyEconomyTick(
      { date: new Date(), treasury: -50_000, approval: 50, stats, projects: [] },
      10
    )
    expect(b.approval).toBeLessThan(a.approval)
  })

  it("makes population, GDP and inflation evolve over time", () => {
    const stats = provider.fetchSync("FR")
    const result = applyEconomyTick(
      { date: new Date(), treasury: 0, approval: 50, stats, projects: [] },
      365
    )
    expect(result.stats.economy.gdpUsd).not.toBe(stats.economy.gdpUsd)
    expect(result.stats.demographics.population).not.toBe(
      stats.demographics.population
    )
  })
})
