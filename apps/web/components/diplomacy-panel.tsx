"use client"

import {
  AI_NATIONS,
  getAiProfile,
  getBlocsForNation,
} from "@workspace/engine"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import {
  BanIcon,
  ChevronRightIcon,
  HandshakeIcon,
  MessageSquareIcon,
  MinusIcon,
  ShoppingCartIcon,
} from "lucide-react"
import { useMemo, useState } from "react"

import { CountryFlag } from "@/components/country-flag"
import { FloatingPanel } from "@/components/floating-panel"
import { useGame, useGameActions } from "@/components/game-provider"
import { useHudState } from "@/components/hud-state"
import { useMapSelection } from "@/components/map-country-regions"
import { MiniSparkline } from "@/components/mini-sparkline"

const relDateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
})

const electionDateFmt = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
})

interface DiplomacyRow {
  code: string
  name: string
  opinion: number
  allied: boolean
  lastInteractionAt: string | null
  lastEconomicActionAt: string | null
  nextElectionAt: string | null
}

const ECONOMIC_COOLDOWN_DAYS = 90

export function DiplomacyPanel() {
  const game = useGame()
  const { diplomacyOpen, closeDiplomacy, diplomacyPos, setDiplomacyPos } =
    useHudState()

  const rows = useMemo<DiplomacyRow[]>(() => {
    if (!game) return []
    return AI_NATIONS.map((p) => {
      const rel = game.relations[p.code]
      return {
        code: p.code,
        name: p.name,
        opinion: rel?.opinion ?? 0,
        allied: rel?.allied ?? false,
        lastInteractionAt: rel?.lastInteractionAt ?? null,
        lastEconomicActionAt: rel?.lastEconomicActionAt ?? null,
        nextElectionAt: game.worldElections?.[p.code]?.nextAt ?? null,
      }
    }).sort((a, b) => b.opinion - a.opinion)
  }, [game?.relations, game?.worldElections])

  if (!game) return null
  const today = game.date.getTime()
  // Per-nation opinion trend pulled from the weekly history snapshots.
  const trends: Record<string, number[]> = {}
  for (const sample of game.history) {
    if (!sample.opinions) continue
    for (const [code, op] of Object.entries(sample.opinions)) {
      ;(trends[code] ??= []).push(op)
    }
  }
  return (
    <FloatingPanel
      open={diplomacyOpen}
      onClose={closeDiplomacy}
      title="Diplomatic relations"
      icon={<HandshakeIcon className="size-4" />}
      position={diplomacyPos}
      onPositionChange={setDiplomacyPos}
      className="w-[400px]"
    >
      <ul className="divide-y">
        {rows.map((r) => (
          <DiplomacyRowItem
            key={r.code}
            row={r}
            today={today}
            trend={trends[r.code] ?? []}
          />
        ))}
      </ul>
    </FloatingPanel>
  )
}

function DiplomacyRowItem({
  row,
  today,
  trend,
}: {
  row: DiplomacyRow
  today: number
  trend: number[]
}) {
  const { signTradeDeal, issueSanctions } = useGameActions()
  const { setSelected } = useMapSelection()
  const [expanded, setExpanded] = useState(false)
  const profile = getAiProfile(row.code)
  const ratio = (row.opinion + 100) / 200 // 0..1
  const color =
    row.opinion >= 30
      ? "bg-emerald-500"
      : row.opinion <= -30
        ? "bg-destructive"
        : "bg-amber-500"
  const lastEcoMs = row.lastEconomicActionAt
    ? Date.parse(row.lastEconomicActionAt)
    : null
  const economicCooldown =
    lastEcoMs !== null && !Number.isNaN(lastEcoMs)
      ? Math.max(
          0,
          Math.ceil(
            (lastEcoMs + ECONOMIC_COOLDOWN_DAYS * 86_400_000 - today) /
              86_400_000
          )
        )
      : 0
  const canTrade = row.opinion >= 20 && economicCooldown === 0
  const canSanction = economicCooldown === 0
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2 text-xs">
      <CountryFlag code={row.code} className="h-4 w-auto rounded-[2px] ring-1 ring-black/20" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-1.5">
          <span className="truncate font-medium">{row.name}</span>
          {row.allied ? (
            <span className="rounded-sm bg-emerald-500/15 px-1 py-px text-[9px] font-semibold uppercase text-emerald-500">
              Allied
            </span>
          ) : null}
          {getBlocsForNation(row.code).map((b) => (
            <span
              key={b.id}
              className="rounded-sm bg-muted px-1 py-px text-[9px] font-medium uppercase tracking-wide text-muted-foreground"
              title={`Bloc: ${b.members.join(", ")}`}
            >
              {b.name}
            </span>
          ))}
        </div>
        <div className="relative mt-1 h-1.5 w-full rounded-full bg-muted">
          <div
            className={cn(
              "absolute top-0 left-1/2 h-1.5 -translate-x-1/2 rounded-full opacity-30",
              "w-px bg-foreground"
            )}
            aria-hidden
          />
          <div
            className={cn("absolute top-0 h-1.5 rounded-full", color)}
            style={{
              left: `${Math.min(50, ratio * 100)}%`,
              width: `${Math.abs(ratio * 100 - 50)}%`,
            }}
          />
        </div>
        <div className="mt-0.5 flex items-baseline justify-between gap-2 text-[10px] text-muted-foreground">
          <span className="tabular-nums">
            {row.opinion > 0 ? "+" : ""}
            {row.opinion.toFixed(0)}
          </span>
          {trend.length >= 2 ? (
            <MiniSparkline
              values={trend}
              min={-100}
              max={100}
              width={48}
              height={12}
              className={
                row.opinion >= 30
                  ? "text-emerald-500"
                  : row.opinion <= -30
                    ? "text-destructive"
                    : "text-amber-500"
              }
            />
          ) : null}
          <span>
            {row.lastInteractionAt ? (
              <>last {relDateFmt.format(new Date(row.lastInteractionAt))}</>
            ) : (
              <span className="inline-flex items-center gap-0.5">
                <MinusIcon className="size-2.5" /> no contact
              </span>
            )}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setSelected({ type: "country", name: row.name, iso2: row.code })
            }
            title="Open country panel"
            className="h-6 px-2 text-[10px]"
          >
            <MessageSquareIcon className="size-3" />
            Message
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!canTrade}
            onClick={() => signTradeDeal(row.code)}
            title={
              !canTrade && row.opinion < 20
                ? `Opinion must be ≥ 20 (currently ${row.opinion.toFixed(0)})`
                : economicCooldown > 0
                  ? `Cooldown: ${economicCooldown}d`
                  : "Sign trade deal: −€300M / +€1500M GDP / +12 opinion"
            }
            className="h-6 px-2 text-[10px]"
          >
            <ShoppingCartIcon className="size-3" />
            Trade
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!canSanction}
            onClick={() => issueSanctions(row.code)}
            title={
              economicCooldown > 0
                ? `Cooldown: ${economicCooldown}d`
                : "Sanction: −€500M / −€600M GDP / −18 opinion (breaks alliance)"
            }
            className="h-6 px-2 text-[10px] text-destructive hover:bg-destructive/10"
          >
            <BanIcon className="size-3" />
            Sanction
          </Button>
          {economicCooldown > 0 ? (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              cooldown {economicCooldown}d
            </span>
          ) : null}
        </div>
        {expanded && profile ? (
          <div className="mt-2 grid gap-1 rounded-sm bg-muted/40 px-2 py-1.5 text-[10px] leading-snug">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Stance</span>
              <span className="capitalize">{profile.stance}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Base opinion</span>
              <span className="tabular-nums">
                {profile.baseOpinion > 0 ? "+" : ""}
                {profile.baseOpinion}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Activity</span>
              <span className="tabular-nums">
                {(profile.activity * 100).toFixed(0)}%
              </span>
            </div>
            {row.nextElectionAt ? (
              <div className="flex items-baseline justify-between">
                <span className="text-muted-foreground">Next election</span>
                <span className="tabular-nums">
                  {electionDateFmt.format(new Date(row.nextElectionAt))}
                </span>
              </div>
            ) : null}
            {Object.keys(profile.reactsTo).length > 0 ? (
              <div>
                <div className="text-muted-foreground">Reacts to</div>
                <ul className="mt-0.5 grid gap-0.5">
                  {(
                    Object.entries(profile.reactsTo) as [
                      keyof typeof profile.reactsTo,
                      number,
                    ][]
                  ).map(([kind, delta]) => (
                    <li
                      key={kind}
                      className="flex items-baseline justify-between"
                    >
                      <span>{kind.replace("construction:", "")}</span>
                      <span
                        className={
                          "tabular-nums " +
                          (delta > 0 ? "text-emerald-500" : "text-destructive")
                        }
                      >
                        {delta > 0 ? "+" : ""}
                        {delta}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="self-start rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label={expanded ? "Collapse profile" : "Expand profile"}
        aria-expanded={expanded}
      >
        <ChevronRightIcon
          className={
            "size-3 transition-transform " + (expanded ? "rotate-90" : "")
          }
        />
      </button>
    </li>
  )
}
