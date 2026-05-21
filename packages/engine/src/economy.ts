import type { CountryStats } from "./country-stats"
import type { Project } from "./projects"

const DAYS_PER_YEAR = 365.25
const MS_PER_DAY = 86_400_000

export interface EconomyTickInput {
  date: Date
  treasury: number
  approval: number
  stats: CountryStats
  projects: readonly Project[]
}

export interface EconomyTickResult {
  treasury: number
  approval: number
  stats: CountryStats
  dailyRevenue: number
  dailyExpenses: number
}

export interface CashflowSummary {
  annualRevenue: number
  annualExpenses: number
  projectMonthlyCost: number
  annualBalance: number
  monthlyBalance: number
}

const REVENUE_PCT_OF_GDP = 0.013
const BASELINE_EXPENSES_PCT_OF_GDP = 0.009
const UNEMPLOYMENT_COST_PER_POINT_PCT_OF_GDP = 0.0006
const APPROVAL_BASELINE = 35
const APPROVAL_DRIFT_PER_DAY = 0.08
const TREASURY_PENALTY_THRESHOLD = -20_000
const TREASURY_PENALTY_PER_DAY = 0.05

export function getCashflow(
  stats: CountryStats,
  projects: readonly Project[]
): CashflowSummary {
  const gdpMillions = stats.economy.gdpUsd / 1_000_000
  const revenue = gdpMillions * REVENUE_PCT_OF_GDP
  const baselineSpending = gdpMillions * BASELINE_EXPENSES_PCT_OF_GDP
  const unemploymentCost =
    gdpMillions *
    UNEMPLOYMENT_COST_PER_POINT_PCT_OF_GDP *
    Math.max(0, stats.economy.unemploymentPct - 5)
  const projectMonthly = projects.reduce((sum, p) => sum + p.monthlyCost, 0)
  const projectAnnual = projectMonthly * 12
  const annualExpenses = baselineSpending + unemploymentCost + projectAnnual
  const annualBalance = revenue - annualExpenses
  return {
    annualRevenue: revenue,
    annualExpenses,
    projectMonthlyCost: projectMonthly,
    annualBalance,
    monthlyBalance: annualBalance / 12,
  }
}

export function applyEconomyTick(
  input: EconomyTickInput,
  days: number
): EconomyTickResult {
  if (days <= 0) {
    return {
      treasury: input.treasury,
      approval: input.approval,
      stats: input.stats,
      dailyRevenue: 0,
      dailyExpenses: 0,
    }
  }
  const cashflow = getCashflow(input.stats, input.projects)
  const dailyRevenue = cashflow.annualRevenue / DAYS_PER_YEAR
  const dailyExpenses = cashflow.annualExpenses / DAYS_PER_YEAR
  const dailyBalance = dailyRevenue - dailyExpenses
  let treasury = input.treasury + dailyBalance * days

  let approval = driftApproval(input.approval, days)
  if (treasury < TREASURY_PENALTY_THRESHOLD) {
    approval = clampApproval(approval - TREASURY_PENALTY_PER_DAY * days)
  }

  const stats = drift(input.stats, days)

  return { treasury, approval, stats, dailyRevenue, dailyExpenses }
}

function driftApproval(approval: number, days: number): number {
  const delta = (APPROVAL_BASELINE - approval) * APPROVAL_DRIFT_PER_DAY * 0.01 * days
  return clampApproval(approval + delta)
}

function clampApproval(v: number): number {
  return Math.max(0, Math.min(100, v))
}

function drift(stats: CountryStats, days: number): CountryStats {
  const yearsFraction = days / DAYS_PER_YEAR
  const economy = { ...stats.economy }
  economy.gdpUsd = economy.gdpUsd * Math.pow(1 + 0.013, yearsFraction)
  economy.gdpPerCapitaUsd = economy.gdpUsd / stats.demographics.population
  economy.inflationPct = clamp(
    economy.inflationPct + (2 - economy.inflationPct) * 0.05 * yearsFraction,
    0,
    20
  )
  economy.unemploymentPct = clamp(
    economy.unemploymentPct + (7 - economy.unemploymentPct) * 0.04 * yearsFraction,
    2,
    25
  )
  const demographics = { ...stats.demographics }
  const natural =
    (stats.demographics.birthRatePer1000 - stats.demographics.deathRatePer1000) /
    1000
  demographics.population = Math.round(
    stats.demographics.population * (1 + natural * yearsFraction)
  )
  return { ...stats, economy, demographics, asOf: stats.asOf }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

export function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / MS_PER_DAY
}
