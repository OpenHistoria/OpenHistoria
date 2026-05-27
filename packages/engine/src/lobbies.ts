import type { Game } from "./game"
import type { ProjectKind } from "./projects"

export const LOBBY_IDS = [
  "unions",
  "industry",
  "ecology",
  "military",
  "public_sector",
] as const

export type LobbyId = (typeof LOBBY_IDS)[number]

export interface LobbyDef {
  id: LobbyId
  label: string
  /** One-line flavour for the UI tooltip. */
  blurb: string
}

export const LOBBIES: readonly LobbyDef[] = [
  {
    id: "unions",
    label: "Unions",
    blurb: "CGT, CFDT, FO. Care about wages and headcount.",
  },
  {
    id: "industry",
    label: "Industry",
    blurb: "Medef and large manufacturers. Want order books and capex.",
  },
  {
    id: "ecology",
    label: "Ecology",
    blurb: "EELV-leaning NGOs. Allergic to nuclear and arms.",
  },
  {
    id: "military",
    label: "Defence",
    blurb: "Joint chiefs and the defence-industrial base.",
  },
  {
    id: "public_sector",
    label: "Public sector",
    blurb: "Civil-service unions and prefectures. Track fiscal stability.",
  },
]

export const NEUTRAL_LOBBY_SATISFACTION = 50

/**
 * State-derived target satisfaction for each lobby. The simulation drifts the
 * stored satisfaction toward these baselines; this function is pure and
 * doesn't mutate.
 */
export function computeLobbyBaselines(game: Game): Record<LobbyId, number> {
  const out: Record<LobbyId, number> = {
    unions: 50,
    industry: 50,
    ecology: 50,
    military: 50,
    public_sector: 50,
  }

  const inflightKinds = new Set<ProjectKind>(game.projects.map((p) => p.kind))
  const treasury = game.treasury
  const unemployment = game.stats.economy.unemploymentPct
  const debtPct = game.stats.economy.publicDebtPctGdp

  // Unions: like jobs, dislike unemployment, like civilian/infrastructure
  // headcount.
  if (inflightKinds.has("construction:civilian")) out.unions += 18
  if (inflightKinds.has("construction:infrastructure")) out.unions += 10
  if (unemployment > 9) out.unions -= 20
  else if (unemployment < 7) out.unions += 8

  // Industry: like industrial / nuclear capex, dislike fiscal panic.
  if (inflightKinds.has("construction:industrial")) out.industry += 22
  if (inflightKinds.has("construction:nuclear")) out.industry += 14
  if (treasury < -100_000) out.industry -= 12
  if (debtPct > 140) out.industry -= 8
  // Active trade deals warm them up.
  const recentTradeDeals = game.briefing
    .slice(0, 30)
    .filter((b) => b.title.startsWith("Trade deal signed with ")).length
  if (recentTradeDeals > 0) out.industry += Math.min(10, recentTradeDeals * 4)

  // Ecology: love infrastructure and civilian, hate nuclear and military.
  if (inflightKinds.has("construction:infrastructure")) out.ecology += 16
  if (inflightKinds.has("construction:civilian")) out.ecology += 10
  if (inflightKinds.has("construction:nuclear")) out.ecology -= 22
  if (inflightKinds.has("construction:military")) out.ecology -= 14

  // Defence: like military / nuclear, like US/GB alliances.
  if (inflightKinds.has("construction:military")) out.military += 22
  if (inflightKinds.has("construction:nuclear")) out.military += 12
  if (game.relations.US?.allied) out.military += 8
  if (game.relations.GB?.allied) out.military += 5
  // Sanctioning a peer power is read as decisive.
  const recentSanctions = game.briefing
    .slice(0, 60)
    .filter((b) => b.title.startsWith("Sanctions imposed on ")).length
  if (recentSanctions > 0) out.military += Math.min(6, recentSanctions * 3)

  // Public sector: track fiscal stability above all.
  if (treasury > -20_000) out.public_sector += 14
  else if (treasury < -200_000) out.public_sector -= 22
  else if (treasury < -80_000) out.public_sector -= 10
  if (debtPct > 150) out.public_sector -= 8

  // Clamp to [0, 100].
  for (const id of LOBBY_IDS) {
    out[id] = Math.max(0, Math.min(100, out[id]))
  }
  return out
}

/** Drift current satisfaction toward the baseline by a fraction per day. */
export function driftLobbies(
  current: Record<LobbyId, number>,
  baselines: Record<LobbyId, number>,
  days: number
): Record<LobbyId, number> {
  const driftFraction = 1 - Math.pow(1 - 0.015, Math.max(1, days))
  const out: Record<LobbyId, number> = { ...current }
  for (const id of LOBBY_IDS) {
    const cur = out[id]
    const target = baselines[id]
    const next = cur + (target - cur) * driftFraction
    out[id] = Math.round(next * 10) / 10
  }
  return out
}

/**
 * Daily approval contribution from the lobby stack. At neutral satisfaction
 * (50) the contribution is zero; very satisfied (>75) adds a tiny daily lift,
 * very unhappy (<25) subtracts. The whole stack maxes at roughly ±0.05/day.
 */
export function lobbyApprovalContribution(
  satisfactions: Record<LobbyId, number>
): number {
  let total = 0
  for (const id of LOBBY_IDS) {
    const s = satisfactions[id]
    if (s >= 75) total += 0.01
    else if (s <= 25) total -= 0.01
  }
  return total
}

export function defaultLobbies(): Record<LobbyId, number> {
  return {
    unions: 50,
    industry: 50,
    ecology: 50,
    military: 50,
    public_sector: 50,
  }
}
