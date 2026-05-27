"use client"

import type { Game, GameOverCause } from "@workspace/engine"

const STORAGE_KEY = "openhistoria:run-history"
const MAX_ENTRIES = 20

export interface RunSummary {
  /** Stable id (timestamp + random nibble) — used as React key. */
  id: string
  /** Real-world ISO timestamp when the run ended. */
  endedAt: string
  /** In-game ISO date when the run ended. */
  inGameEndedAt: string
  outcome: "won" | "lost"
  cause: GameOverCause
  agendaId: string | null
  finalApproval: number
  finalTreasury: number
  finalDebt: number
  finalUnemployment: number
  completedProjects: number
  triggeredEvents: number
  allies: string[]
}

export function summariseRun(game: Game): RunSummary {
  const cause: GameOverCause =
    game.gameOver?.cause ??
    (game.gameOver?.outcome === "won" ? "election_won" : "election_lost")
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    endedAt: new Date().toISOString(),
    inGameEndedAt:
      game.gameOver?.date ?? game.date.toISOString(),
    outcome: game.gameOver?.outcome ?? "lost",
    cause,
    agendaId: game.reformAgenda?.id ?? null,
    finalApproval: round1(game.approval),
    finalTreasury: Math.round(game.treasury),
    finalDebt: round1(game.stats.economy.publicDebtPctGdp),
    finalUnemployment: round1(game.stats.economy.unemploymentPct),
    completedProjects: game.briefing.filter(
      (b) => b.kind === "project_completed"
    ).length,
    triggeredEvents: game.triggeredEvents.length,
    allies: Object.entries(game.relations)
      .filter(([, r]) => r.allied)
      .map(([code]) => code),
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function loadRunHistory(): RunSummary[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((r): r is RunSummary => {
      return (
        typeof r === "object" &&
        r != null &&
        typeof (r as RunSummary).id === "string"
      )
    })
  } catch {
    return []
  }
}

export function recordRun(summary: RunSummary): RunSummary[] {
  if (typeof window === "undefined") return [summary]
  const all = loadRunHistory()
  // Dedup by id (idempotent) and prepend.
  const filtered = all.filter((r) => r.id !== summary.id)
  const next = [summary, ...filtered].slice(0, MAX_ENTRIES)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // best-effort
  }
  return next
}

export function clearRunHistory(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEY)
}
