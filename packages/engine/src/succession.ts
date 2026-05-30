import { AI_NATIONS, getAiProfile } from "./ai-nations"
import { getClock } from "./clock"
import { DEFAULT_RELATION, type BriefingKind, type RelationState } from "./game"

/**
 * World political calendar + leadership-succession model.
 *
 * Every foreign nation runs on its own electoral / succession clock. When a
 * nation's transition comes due the engine resolves it: the incumbent is
 * either returned or turned over, and the player's bilateral opinion with that
 * nation shifts to reflect the new (or re-confirmed) government. Democracies
 * change hands often; autocracies rarely. This keeps the world alive over a
 * multi-month mandate instead of freezing every foreign leader in place.
 *
 * The player's OWN country is handled separately by the terminal election in
 * `game.ts` — this module only governs foreign nations.
 */

export interface NationElection {
  /** ISO date (YYYY-MM-DD) of the next scheduled leadership transition. */
  nextAt: string
  /** Days between transitions for this nation. */
  termDays: number
}

export type WorldElections = Record<string, NationElection>

export interface WorldElectionAction {
  code: string
  /** True when the government changed hands (vs incumbent retained). */
  turnover: boolean
  /** Bilateral opinion change applied to the player's relation. */
  opinionDelta: number
  /** Set when a turnover lapses a standing alliance. */
  setAllied?: boolean
  briefingKind: BriefingKind
  briefingTitle: string
  briefingDetail: string
}

export interface ResolveWorldElectionsInput {
  worldElections: WorldElections
  relations: Readonly<Record<string, RelationState>>
  playerNation: string
  /** Exclusive lower bound — the previous tick date. */
  from: Date
  /** Inclusive upper bound — the new tick date. */
  to: Date
}

export interface ResolveWorldElectionsResult {
  worldElections: WorldElections
  relations: Record<string, RelationState>
  actions: WorldElectionAction[]
}

const MS_PER_DAY = 86_400_000
const DEFAULT_TERM_YEARS = 4

// Hand-tuned term lengths. Autocratic-leaning states get long terms so
// transitions are rare; parliamentary/presidential democracies cycle faster.
const TERM_YEARS: Record<string, number> = {
  US: 4,
  GB: 5,
  DE: 4,
  IT: 5,
  ES: 4,
  JP: 4,
  BR: 4,
  IN: 5,
  AU: 3,
  CA: 4,
  RU: 6,
  CN: 5,
}

function termYearsFor(code: string): number {
  return TERM_YEARS[code] ?? DEFAULT_TERM_YEARS
}

/** Probability the incumbent is turned over at a given transition. */
function turnoverChance(code: string): number {
  const profile = getAiProfile(code)
  // Hostile/rival here stands in for less-contested systems.
  if (profile?.stance === "hostile" || profile?.stance === "rival") return 0.15
  return 0.45
}

function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function clampOpinion(v: number): number {
  return Math.max(-100, Math.min(100, v))
}

/** Stable, clock-independent hash so init is deterministic per code. */
function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0
  }
  return h
}

/**
 * Seed each foreign nation's next transition, spread deterministically across
 * its term so a realistic handful land inside any given mandate window.
 */
export function initWorldElections(
  playerNation: string,
  start: Date
): WorldElections {
  const player = playerNation.trim().toUpperCase()
  const out: WorldElections = {}
  for (const p of AI_NATIONS) {
    if (p.code === player) continue
    const termDays = Math.round(termYearsFor(p.code) * 365.25)
    // Offset in [1, termDays-1] so nobody holds an election on day 0.
    const span = Math.max(1, termDays - 1)
    const offset = 1 + (hashCode(p.code) % span)
    const nextAt = new Date(start.getTime() + offset * MS_PER_DAY)
    out[p.code] = { nextAt: isoDateOnly(nextAt), termDays }
  }
  return out
}

function isAutocratic(code: string): boolean {
  const profile = getAiProfile(code)
  return profile?.stance === "hostile" || profile?.stance === "rival"
}

/**
 * Advance the world political calendar from `from` to `to`, resolving every
 * transition that comes due in that window. Pure given the clock RNG; returns
 * the updated calendar, the updated relations, and a list of actions for the
 * caller to fold into briefings.
 */
export function resolveWorldElections(
  input: ResolveWorldElectionsInput
): ResolveWorldElectionsResult {
  const player = input.playerNation.trim().toUpperCase()
  const worldElections: WorldElections = {}
  const relations: Record<string, RelationState> = { ...input.relations }
  const actions: WorldElectionAction[] = []
  const toMs = input.to.getTime()
  const rand = () => getClock().random()

  for (const [code, entry] of Object.entries(input.worldElections)) {
    if (code === player) continue
    let nextMs = Date.parse(`${entry.nextAt}T00:00:00.000Z`)
    const termMs = entry.termDays * MS_PER_DAY
    if (!Number.isFinite(nextMs) || termMs <= 0) {
      worldElections[code] = entry
      continue
    }

    // Resolve every transition whose date has now passed. The loop guards
    // against very large `days` jumps spanning multiple terms.
    while (nextMs <= toMs) {
      const profile = getAiProfile(code)
      const name = profile?.name ?? code
      const current = relations[code] ?? DEFAULT_RELATION
      const turnover = rand() < turnoverChance(code)

      let opinionDelta: number
      let setAllied: boolean | undefined
      let briefingTitle: string
      let briefingDetail: string
      let briefingKind: BriefingKind

      if (turnover) {
        // A new government re-aligns: a meaningful, signed swing.
        const magnitude = 8 + Math.round(rand() * 17) // 8..25
        const sign = rand() < 0.5 ? -1 : 1
        opinionDelta = magnitude * sign
        const newOpinion = clampOpinion(current.opinion + opinionDelta)
        if (current.allied && newOpinion <= -30) {
          setAllied = false
        }
        briefingKind = opinionDelta < 0 ? "warning" : "milestone"
        briefingTitle = isAutocratic(code)
          ? `Leadership succession in ${name}`
          : `${name} holds elections — new government`
        briefingDetail = `${
          setAllied === false ? "Alliance lapses. " : ""
        }Opinion ${formatSigned(opinionDelta)} (${code}).`
      } else {
        // Incumbent returned: minor recalibration.
        const magnitude = Math.round(rand() * 5) // 0..5
        const sign = rand() < 0.5 ? -1 : 1
        opinionDelta = magnitude * sign
        briefingKind = "milestone"
        briefingTitle = isAutocratic(code)
          ? `${name} confirms its leadership`
          : `${name} holds elections — incumbent returned`
        briefingDetail = `Continuity. Opinion ${formatSigned(opinionDelta)} (${code}).`
      }

      const base = relations[code] ?? DEFAULT_RELATION
      const nextRelation: RelationState = {
        ...base,
        opinion: clampOpinion(base.opinion + opinionDelta),
        allied: setAllied === false ? false : base.allied,
        lastInteractionAt: isoDateOnly(input.to),
      }
      relations[code] = nextRelation

      actions.push({
        code,
        turnover,
        opinionDelta,
        setAllied,
        briefingKind,
        briefingTitle,
        briefingDetail,
      })

      nextMs += termMs
    }

    worldElections[code] = { nextAt: isoDateOnly(new Date(nextMs)), termDays: entry.termDays }
  }

  return { worldElections, relations, actions }
}

function formatSigned(n: number): string {
  return n > 0 ? `+${n}` : `${n}`
}
