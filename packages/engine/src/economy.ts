import type { CountryStats } from "./country-stats"
import {
  approvalBaselineShift,
  inflationTargetShift,
  NEUTRAL_FISCAL_POLICY,
  spendingExpenseMultiplier,
  taxRevenueMultiplier,
  unemploymentTargetShift,
  type FiscalPolicy,
} from "./fiscal"
import type { Project } from "./projects"

const DAYS_PER_YEAR = 365.25
const MS_PER_DAY = 86_400_000

export interface EconomyTickInput {
  date: Date
  treasury: number
  approval: number
  stats: CountryStats
  projects: readonly Project[]
  /** Active budget levers. Defaults to neutral ("current policy"). */
  fiscalPolicy?: FiscalPolicy
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
  /** Annual debt-service expense in €M (already folded into annualExpenses). */
  annualInterest: number
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
// Annual interest rate the treasury pays on outstanding debt. Modest because
// French debt is heavily long-dated; the gameplay point is to make high
// debt/GDP a real running cost, not a one-tick hit.
const DEBT_INTEREST_RATE = 0.025
// Inflation above target makes bond markets demand higher yields: each
// percentage point of inflation over `INFLATION_TARGET` adds this much to the
// effective debt-service rate.
const DEBT_RATE_PER_INFLATION_POINT = 0.0015
// Price stability band. Inflation above the comfort ceiling reads as a
// cost-of-living squeeze and erodes approval; the drift target is the centre.
export const INFLATION_TARGET = 2
export const INFLATION_COMFORT_CEILING = 3
// Daily approval drag per percentage point of inflation above the comfort
// ceiling. At 6% inflation (3pp over) this is ~0.12/day ≈ 3.6/month.
const INFLATION_APPROVAL_DRAG_PER_DAY = 0.04

/**
 * Daily approval drag from cost-of-living pressure at the given inflation
 * level. Zero at or below the comfort ceiling, linear above it. Pure so the UI
 * can surface the same number the tick applies.
 */
export function costOfLivingApprovalDragPerDay(inflationPct: number): number {
  const over = Math.max(0, inflationPct - INFLATION_COMFORT_CEILING)
  return over * INFLATION_APPROVAL_DRAG_PER_DAY
}

/** Effective annual debt-service rate, rising with above-target inflation. */
export function effectiveDebtRate(inflationPct: number): number {
  const over = Math.max(0, inflationPct - INFLATION_TARGET)
  return DEBT_INTEREST_RATE + over * DEBT_RATE_PER_INFLATION_POINT
}
// Treasury floor at -€2T to keep arithmetic well-defined; below that we just
// stop accumulating losses (the game-over check in Game will have fired well
// before this is reached).
const TREASURY_FLOOR = -2_000_000
const GDP_FLOOR = 1_000_000_000 // $1B — keeps per-capita math finite

export function getCashflow(
  stats: CountryStats,
  projects: readonly Project[],
  fiscalPolicy: FiscalPolicy = NEUTRAL_FISCAL_POLICY
): CashflowSummary {
  const gdpMillions = stats.economy.gdpUsd / 1_000_000
  const revenue =
    gdpMillions * REVENUE_PCT_OF_GDP * taxRevenueMultiplier(fiscalPolicy)
  const baselineSpending =
    gdpMillions *
    BASELINE_EXPENSES_PCT_OF_GDP *
    spendingExpenseMultiplier(fiscalPolicy)
  const unemploymentCost =
    gdpMillions *
    UNEMPLOYMENT_COST_PER_POINT_PCT_OF_GDP *
    Math.max(0, stats.economy.unemploymentPct - 5)
  const projectMonthly = projects.reduce((sum, p) => sum + p.monthlyCost, 0)
  const projectAnnual = projectMonthly * 12
  // Debt service: outstanding stock × annual rate. publicDebtPctGdp is in %.
  // The rate rises with above-target inflation (markets demand higher yields).
  const debtStock = gdpMillions * (stats.economy.publicDebtPctGdp / 100)
  const annualInterest = Math.max(
    0,
    debtStock * effectiveDebtRate(stats.economy.inflationPct)
  )
  const annualExpenses =
    baselineSpending + unemploymentCost + projectAnnual + annualInterest
  const annualBalance = revenue - annualExpenses
  return {
    annualRevenue: revenue,
    annualExpenses,
    projectMonthlyCost: projectMonthly,
    annualInterest,
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
  const fiscalPolicy = input.fiscalPolicy ?? NEUTRAL_FISCAL_POLICY
  const cashflow = getCashflow(input.stats, input.projects, fiscalPolicy)
  const dailyRevenue = cashflow.annualRevenue / DAYS_PER_YEAR
  const dailyExpenses = cashflow.annualExpenses / DAYS_PER_YEAR
  const dailyBalance = dailyRevenue - dailyExpenses
  let treasury = safeNumber(
    input.treasury + dailyBalance * days,
    input.treasury
  )
  if (treasury < TREASURY_FLOOR) treasury = TREASURY_FLOOR

  let approval = driftApproval(input.approval, days, fiscalPolicy)
  if (treasury < TREASURY_PENALTY_THRESHOLD) {
    // Penalty scales with depth so a runaway deficit actually hurts.
    const depth = (TREASURY_PENALTY_THRESHOLD - treasury) / 100_000
    const penalty = TREASURY_PENALTY_PER_DAY * (1 + Math.min(3, depth)) * days
    approval = clampApproval(approval - penalty)
  }
  // Cost-of-living squeeze: inflation above the comfort ceiling bleeds approval.
  const colDrag = costOfLivingApprovalDragPerDay(input.stats.economy.inflationPct)
  if (colDrag > 0) {
    approval = clampApproval(approval - colDrag * days)
  }

  const stats = drift(input.stats, days, fiscalPolicy)

  return { treasury, approval, stats, dailyRevenue, dailyExpenses }
}

function driftApproval(
  approval: number,
  days: number,
  fiscalPolicy: FiscalPolicy
): number {
  // The budget stance shifts the baseline approval drifts toward: tax hikes
  // pull it down, spending boosts pull it up. Clamp the shifted baseline to a
  // sane band so the levers can't peg approval at an extreme on their own.
  const baseline = Math.max(
    10,
    Math.min(70, APPROVAL_BASELINE + approvalBaselineShift(fiscalPolicy))
  )
  const delta = (baseline - approval) * APPROVAL_DRIFT_PER_DAY * 0.01 * days
  return clampApproval(approval + delta)
}

function clampApproval(v: number): number {
  return Math.max(0, Math.min(100, v))
}

function drift(
  stats: CountryStats,
  days: number,
  fiscalPolicy: FiscalPolicy
): CountryStats {
  const yearsFraction = clamp(days / DAYS_PER_YEAR, -50, 50)
  const economy = { ...stats.economy }
  const rawGdp = economy.gdpUsd * Math.pow(1 + 0.013, yearsFraction)
  economy.gdpUsd = Math.max(GDP_FLOOR, safeNumber(rawGdp, economy.gdpUsd))
  const pop = Math.max(1, stats.demographics.population)
  economy.gdpPerCapitaUsd = safeNumber(
    economy.gdpUsd / pop,
    economy.gdpPerCapitaUsd
  )
  // Inflation drifts toward a fiscal-sensitive target: spending boosts heat it,
  // tax hikes / austerity cool it.
  const inflationTarget = clamp(
    INFLATION_TARGET + inflationTargetShift(fiscalPolicy),
    0,
    20
  )
  economy.inflationPct = clamp(
    safeNumber(
      economy.inflationPct +
        (inflationTarget - economy.inflationPct) * 0.05 * yearsFraction,
      economy.inflationPct
    ),
    0,
    20
  )
  // Spending boosts pull the unemployment target down (stimulus), austerity and
  // tax hikes push it up. Clamp the shifted target to a plausible band.
  const unemploymentTarget = clamp(
    7 + unemploymentTargetShift(fiscalPolicy),
    3,
    12
  )
  economy.unemploymentPct = clamp(
    safeNumber(
      economy.unemploymentPct +
        (unemploymentTarget - economy.unemploymentPct) * 0.04 * yearsFraction,
      economy.unemploymentPct
    ),
    2,
    25
  )
  const demographics = { ...stats.demographics }
  const natural =
    (stats.demographics.birthRatePer1000 - stats.demographics.deathRatePer1000) /
    1000
  const nextPop = Math.round(
    safeNumber(
      stats.demographics.population * (1 + natural * yearsFraction),
      stats.demographics.population
    )
  )
  demographics.population = Math.max(1, nextPop)
  return { ...stats, economy, demographics, asOf: stats.asOf }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function safeNumber(v: number, fallback: number): number {
  if (Number.isFinite(v)) return v
  return fallback
}

/**
 * Returns a sanitised stats object: any NaN/Infinity values are replaced with
 * the matching value from `fallback` (typically the previous tick's stats or
 * the initial-stats record). Called whenever stats cross a trust boundary
 * (load from storage, after applyEffects, etc.).
 */
export function sanitizeStats(
  stats: CountryStats,
  fallback: CountryStats
): CountryStats {
  return {
    ...stats,
    economy: {
      gdpUsd: Math.max(
        GDP_FLOOR,
        safeNumber(stats.economy.gdpUsd, fallback.economy.gdpUsd)
      ),
      gdpPerCapitaUsd: safeNumber(
        stats.economy.gdpPerCapitaUsd,
        fallback.economy.gdpPerCapitaUsd
      ),
      unemploymentPct: clamp(
        safeNumber(
          stats.economy.unemploymentPct,
          fallback.economy.unemploymentPct
        ),
        0,
        100
      ),
      inflationPct: clamp(
        safeNumber(stats.economy.inflationPct, fallback.economy.inflationPct),
        -50,
        100
      ),
      publicDebtPctGdp: clamp(
        safeNumber(
          stats.economy.publicDebtPctGdp,
          fallback.economy.publicDebtPctGdp
        ),
        0,
        1000
      ),
    },
    demographics: {
      ...stats.demographics,
      population: Math.max(
        1,
        Math.round(
          safeNumber(
            stats.demographics.population,
            fallback.demographics.population
          )
        )
      ),
    },
  }
}

export function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / MS_PER_DAY
}
