"use client"

import {
  getCashflow,
  SPENDING_LEVER_OPTIONS,
  TAX_LEVER_OPTIONS,
  type FiscalLever,
  type FiscalLeverOption,
} from "@workspace/engine"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { CheckIcon, LandmarkIcon, PiggyBankIcon } from "lucide-react"
import { useMemo, type ReactNode } from "react"

import { useGame, useGameActions } from "@/components/game-provider"

const eurFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
  style: "currency",
  currency: "EUR",
})

function formatBalance(monthlyMillions: number): string {
  const sign = monthlyMillions < 0 ? "−" : "+"
  return `${sign}${eurFormatter.format(Math.abs(monthlyMillions) * 1_000_000)}/mo`
}

export function BudgetSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const game = useGame()
  const { setFiscalPolicy } = useGameActions()

  const policy = game?.fiscalPolicy ?? { tax: 0, spending: 0 }

  // Live preview of the monthly balance under the *current* policy, and what a
  // hovered/selected lever would do, so the trade-off is visible before
  // committing.
  const currentBalance = useMemo(
    () =>
      game ? getCashflow(game.stats, game.projects, policy).monthlyBalance : 0,
    [game, policy]
  )

  function previewBalance(next: Partial<typeof policy>): number {
    if (!game) return 0
    return getCashflow(game.stats, game.projects, { ...policy, ...next })
      .monthlyBalance
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <PiggyBankIcon className="size-5" /> Budget
          </SheetTitle>
          <SheetDescription>
            Two levers set the fiscal stance. Taxes trade treasury revenue
            against popularity; spending trades the deficit against jobs and
            approval. Push spending too hard and inflation overheats — a
            cost-of-living squeeze that bleeds approval and raises debt costs.
            Lobbies react the moment a budget is announced.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 px-4 pb-4">
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Projected monthly balance
              </span>
              <span
                className={
                  currentBalance < 0
                    ? "font-semibold tabular-nums text-destructive"
                    : "font-semibold tabular-nums text-emerald-500"
                }
              >
                {formatBalance(currentBalance)}
              </span>
            </div>
          </div>

          <LeverGroup
            title="Tax stance"
            icon={<LandmarkIcon className="size-4" />}
            options={TAX_LEVER_OPTIONS}
            value={policy.tax}
            onSelect={(value) => setFiscalPolicy({ tax: value })}
            previewBalance={(value) => previewBalance({ tax: value })}
          />

          <LeverGroup
            title="Public spending"
            icon={<PiggyBankIcon className="size-4" />}
            options={SPENDING_LEVER_OPTIONS}
            value={policy.spending}
            onSelect={(value) => setFiscalPolicy({ spending: value })}
            previewBalance={(value) => previewBalance({ spending: value })}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function LeverGroup({
  title,
  icon,
  options,
  value,
  onSelect,
  previewBalance,
}: {
  title: string
  icon: ReactNode
  options: readonly FiscalLeverOption[]
  value: FiscalLever
  onSelect: (value: FiscalLever) => void
  previewBalance: (value: FiscalLever) => number
}) {
  return (
    <div className="grid gap-2 rounded-md border bg-card p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="grid gap-1.5">
        {options.map((opt) => {
          const isActive = opt.value === value
          const delta = previewBalance(opt.value) - previewBalance(value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={
                "grid grid-cols-[1fr_auto] items-center gap-2 rounded-sm border px-2.5 py-1.5 text-left transition-colors " +
                (isActive
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:border-border")
              }
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium leading-tight">
                    {opt.label}
                  </span>
                  {isActive && (
                    <CheckIcon className="size-3.5 text-primary" />
                  )}
                </div>
                <p className="text-xs leading-snug text-muted-foreground">
                  {opt.blurb}
                </p>
              </div>
              {!isActive && Math.abs(delta) >= 1 && (
                <span
                  className={
                    "shrink-0 text-[11px] tabular-nums " +
                    (delta < 0 ? "text-destructive" : "text-emerald-500")
                  }
                  title="Change to projected monthly balance vs. the current setting"
                >
                  {delta < 0 ? "−" : "+"}
                  {eurFormatter.format(Math.abs(delta) * 1_000_000)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
