/**
 * Fiscal policy — two discrete budget levers the player controls directly.
 *
 * `tax` moves the tax stance from deep cuts (−2) to a big hike (+2); `spending`
 * moves public spending from austerity (−2) to a major boost (+2). Both default
 * to 0 ("current policy"), which leaves the passive economy exactly as it was
 * before this module existed — so older saves with no fiscal field behave
 * identically once defaulted to neutral on read.
 *
 * The model is intentionally legible: each notch is a fixed, linear nudge. Tax
 * notches scale treasury revenue and shift the approval baseline; spending
 * notches scale baseline expenses, shift the approval baseline the other way,
 * and pull the unemployment target. The two levers pull against each other —
 * funding generous spending without raising taxes blows out the deficit, while
 * austerity-plus-tax-hikes balances the books at a real approval cost.
 */

export type FiscalLever = -2 | -1 | 0 | 1 | 2

export interface FiscalPolicy {
  /** Tax stance. Negative = cuts (less revenue, more popular), positive = hikes. */
  tax: FiscalLever
  /** Public spending. Negative = austerity, positive = expansion. */
  spending: FiscalLever
}

export const FISCAL_LEVERS: readonly FiscalLever[] = [-2, -1, 0, 1, 2]

export const NEUTRAL_FISCAL_POLICY: FiscalPolicy = { tax: 0, spending: 0 }

export interface FiscalLeverOption {
  value: FiscalLever
  label: string
  /** One-line description for the UI. */
  blurb: string
}

export const TAX_LEVER_OPTIONS: readonly FiscalLeverOption[] = [
  { value: -2, label: "Deep cuts", blurb: "−24% revenue. Markets cheer, the budget bleeds." },
  { value: -1, label: "Tax cuts", blurb: "−12% revenue, a popularity bump." },
  { value: 0, label: "Hold", blurb: "Current tax settings." },
  { value: 1, label: "Tax hike", blurb: "+12% revenue, voters grumble." },
  { value: 2, label: "Big hike", blurb: "+24% revenue at a steep approval cost." },
]

export const SPENDING_LEVER_OPTIONS: readonly FiscalLeverOption[] = [
  { value: -2, label: "Deep austerity", blurb: "−36% baseline spending. Unemployment creeps up." },
  { value: -1, label: "Spending cuts", blurb: "−18% baseline spending." },
  { value: 0, label: "Hold", blurb: "Current spending plan." },
  { value: 1, label: "Spending boost", blurb: "+18% spending. Jobs and approval up." },
  { value: 2, label: "Major boost", blurb: "+36% spending. Crowd-pleasing but costly." },
]

// Per-notch coefficients. Linear in the notch so the levers read predictably.
export const TAX_REVENUE_PER_NOTCH = 0.12 // ±12% treasury revenue per notch
export const TAX_APPROVAL_BASELINE_PER_NOTCH = -2.6 // hikes drag approval down
export const TAX_UNEMP_TARGET_PER_NOTCH = 0.25 // hikes nudge the unemployment target up

export const SPEND_EXPENSE_PER_NOTCH = 0.18 // ±18% baseline spending per notch
export const SPEND_APPROVAL_BASELINE_PER_NOTCH = 2.0 // spending buys approval
export const SPEND_UNEMP_TARGET_PER_NOTCH = -0.6 // spending pulls the unemployment target down

/** Multiplier applied to treasury revenue for the given tax notch. */
export function taxRevenueMultiplier(policy: FiscalPolicy): number {
  return 1 + TAX_REVENUE_PER_NOTCH * policy.tax
}

/** Multiplier applied to baseline (non-project, non-debt) spending. */
export function spendingExpenseMultiplier(policy: FiscalPolicy): number {
  return 1 + SPEND_EXPENSE_PER_NOTCH * policy.spending
}

/**
 * Signed shift applied to the passive approval baseline. Tax hikes lower it,
 * spending boosts raise it; at neutral the shift is exactly zero.
 */
export function approvalBaselineShift(policy: FiscalPolicy): number {
  return (
    TAX_APPROVAL_BASELINE_PER_NOTCH * policy.tax +
    SPEND_APPROVAL_BASELINE_PER_NOTCH * policy.spending
  )
}

/** Signed shift applied to the unemployment drift target. */
export function unemploymentTargetShift(policy: FiscalPolicy): number {
  return (
    TAX_UNEMP_TARGET_PER_NOTCH * policy.tax +
    SPEND_UNEMP_TARGET_PER_NOTCH * policy.spending
  )
}

// Demand-side pressure on prices. Spending boosts heat inflation (more demand);
// tax hikes and austerity cool it (less disposable income, weaker demand).
export const SPEND_INFLATION_TARGET_PER_NOTCH = 0.6
export const TAX_INFLATION_TARGET_PER_NOTCH = -0.35

/** Signed shift applied to the inflation drift target. */
export function inflationTargetShift(policy: FiscalPolicy): number {
  return (
    SPEND_INFLATION_TARGET_PER_NOTCH * policy.spending +
    TAX_INFLATION_TARGET_PER_NOTCH * policy.tax
  )
}

function clampLever(v: number): FiscalLever {
  const r = Math.round(v)
  if (r <= -2) return -2
  if (r >= 2) return 2
  return r as FiscalLever
}

/** Coerce an arbitrary (possibly persisted/partial) value into a valid policy. */
export function sanitizeFiscalPolicy(
  value: Partial<FiscalPolicy> | null | undefined
): FiscalPolicy {
  if (!value) return { ...NEUTRAL_FISCAL_POLICY }
  return {
    tax: clampLever(Number.isFinite(value.tax) ? (value.tax as number) : 0),
    spending: clampLever(
      Number.isFinite(value.spending) ? (value.spending as number) : 0
    ),
  }
}

export function fiscalPolicyEquals(a: FiscalPolicy, b: FiscalPolicy): boolean {
  return a.tax === b.tax && a.spending === b.spending
}

export function taxLeverLabel(value: FiscalLever): string {
  return TAX_LEVER_OPTIONS.find((o) => o.value === value)?.label ?? "Hold"
}

export function spendingLeverLabel(value: FiscalLever): string {
  return SPENDING_LEVER_OPTIONS.find((o) => o.value === value)?.label ?? "Hold"
}
