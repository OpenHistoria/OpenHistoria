import { describe, expect, it } from "vitest"

import { CountryStatsProvider } from "../src/country-stats"
import { applyEconomyTick, getCashflow } from "../src/economy"
import {
  approvalBaselineShift,
  NEUTRAL_FISCAL_POLICY,
  sanitizeFiscalPolicy,
  spendingExpenseMultiplier,
  taxRevenueMultiplier,
  type FiscalPolicy,
} from "../src/fiscal"

const provider = new CountryStatsProvider()

describe("fiscal multipliers", () => {
  it("is neutral at the default policy", () => {
    expect(taxRevenueMultiplier(NEUTRAL_FISCAL_POLICY)).toBe(1)
    expect(spendingExpenseMultiplier(NEUTRAL_FISCAL_POLICY)).toBe(1)
    expect(approvalBaselineShift(NEUTRAL_FISCAL_POLICY)).toBe(0)
  })

  it("scales revenue up with tax hikes and down with cuts", () => {
    expect(taxRevenueMultiplier({ tax: 2, spending: 0 })).toBeGreaterThan(1)
    expect(taxRevenueMultiplier({ tax: -2, spending: 0 })).toBeLessThan(1)
  })

  it("scales baseline spending up with boosts and down with austerity", () => {
    expect(spendingExpenseMultiplier({ tax: 0, spending: 2 })).toBeGreaterThan(1)
    expect(spendingExpenseMultiplier({ tax: 0, spending: -2 })).toBeLessThan(1)
  })

  it("tax hikes drag the approval baseline down, spending lifts it", () => {
    expect(approvalBaselineShift({ tax: 2, spending: 0 })).toBeLessThan(0)
    expect(approvalBaselineShift({ tax: 0, spending: 2 })).toBeGreaterThan(0)
  })
})

describe("sanitizeFiscalPolicy", () => {
  it("defaults nullish input to neutral", () => {
    expect(sanitizeFiscalPolicy(null)).toEqual(NEUTRAL_FISCAL_POLICY)
    expect(sanitizeFiscalPolicy(undefined)).toEqual(NEUTRAL_FISCAL_POLICY)
  })

  it("clamps out-of-range and non-finite levers", () => {
    expect(
      sanitizeFiscalPolicy({ tax: 9, spending: -9 } as unknown as FiscalPolicy)
    ).toEqual({ tax: 2, spending: -2 })
    expect(
      sanitizeFiscalPolicy({ tax: NaN, spending: 1 } as unknown as FiscalPolicy)
    ).toEqual({ tax: 0, spending: 1 })
  })

  it("rounds fractional levers to the nearest notch", () => {
    expect(
      sanitizeFiscalPolicy({ tax: 1.4, spending: 0 } as unknown as FiscalPolicy)
    ).toEqual({ tax: 1, spending: 0 })
  })
})

describe("getCashflow with fiscal policy", () => {
  it("a tax hike raises revenue, austerity cuts baseline spending", () => {
    const stats = provider.fetchSync("FR")
    const neutral = getCashflow(stats, [])
    const hiked = getCashflow(stats, [], { tax: 2, spending: 0 })
    expect(hiked.annualRevenue).toBeGreaterThan(neutral.annualRevenue)

    const austere = getCashflow(stats, [], { tax: 0, spending: -2 })
    // Austerity lowers baseline spending, so total expenses drop.
    expect(austere.annualExpenses).toBeLessThan(neutral.annualExpenses)
  })

  it("hiking taxes and cutting spending improves the balance", () => {
    const stats = provider.fetchSync("FR")
    const neutral = getCashflow(stats, [])
    const tightened = getCashflow(stats, [], { tax: 2, spending: -2 })
    expect(tightened.annualBalance).toBeGreaterThan(neutral.annualBalance)
  })
})

describe("applyEconomyTick with fiscal policy", () => {
  it("drifts approval toward a higher baseline under spending boosts", () => {
    const stats = provider.fetchSync("FR")
    const base = applyEconomyTick(
      { date: new Date(), treasury: 0, approval: 38, stats, projects: [] },
      30
    )
    const boosted = applyEconomyTick(
      {
        date: new Date(),
        treasury: 0,
        approval: 38,
        stats,
        projects: [],
        fiscalPolicy: { tax: 0, spending: 2 },
      },
      30
    )
    expect(boosted.approval).toBeGreaterThan(base.approval)
  })

  it("drifts approval toward a lower baseline under heavy tax hikes", () => {
    const stats = provider.fetchSync("FR")
    const base = applyEconomyTick(
      { date: new Date(), treasury: 0, approval: 38, stats, projects: [] },
      30
    )
    const taxed = applyEconomyTick(
      {
        date: new Date(),
        treasury: 0,
        approval: 38,
        stats,
        projects: [],
        fiscalPolicy: { tax: 2, spending: 0 },
      },
      30
    )
    expect(taxed.approval).toBeLessThan(base.approval)
  })

  it("spending stimulus pulls unemployment down vs austerity over a year", () => {
    const stats = provider.fetchSync("FR")
    const boosted = applyEconomyTick(
      {
        date: new Date(),
        treasury: 0,
        approval: 38,
        stats,
        projects: [],
        fiscalPolicy: { tax: 0, spending: 2 },
      },
      365
    )
    const austere = applyEconomyTick(
      {
        date: new Date(),
        treasury: 0,
        approval: 38,
        stats,
        projects: [],
        fiscalPolicy: { tax: 0, spending: -2 },
      },
      365
    )
    expect(boosted.stats.economy.unemploymentPct).toBeLessThan(
      austere.stats.economy.unemploymentPct
    )
  })
})
