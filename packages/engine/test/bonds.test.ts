import { describe, expect, it } from "vitest"

import { Game } from "../src/game"
import { useDeterministicEngine } from "./helpers"

useDeterministicEngine({
  startDate: new Date("2026-05-21T08:00:00.000Z"),
  seed: 3,
})

describe("issueBond", () => {
  it("refuses issuance once debt/GDP crosses the hard cap and logs a warning", () => {
    const game = Game.createNew().with({
      stats: {
        ...Game.createNew().stats,
        economy: {
          ...Game.createNew().stats.economy,
          publicDebtPctGdp: 165,
        },
      },
    })
    const next = game.issueBond(5_000)
    expect(next.treasury).toBe(game.treasury)
    expect(next.briefing[0]?.kind).toBe("warning")
    expect(next.briefing[0]?.title).toContain("Bond auction failed")
  })

  it("applies progressively higher costs above the stress threshold", () => {
    const baseStats = Game.createNew().stats
    const calm = Game.createNew()
    const stressed = Game.createNew().with({
      stats: {
        ...baseStats,
        economy: { ...baseStats.economy, publicDebtPctGdp: 150 },
      },
    })
    const calmNext = calm.issueBond(10_000)
    const stressedNext = stressed.issueBond(10_000)
    const calmDebt =
      calmNext.stats.economy.publicDebtPctGdp -
      calm.stats.economy.publicDebtPctGdp
    const stressedDebt =
      stressedNext.stats.economy.publicDebtPctGdp -
      stressed.stats.economy.publicDebtPctGdp
    expect(stressedDebt).toBeGreaterThan(calmDebt)
    const calmApproval = calm.approval - calmNext.approval
    const stressedApproval = stressed.approval - stressedNext.approval
    expect(stressedApproval).toBeGreaterThan(calmApproval)
  })
})
