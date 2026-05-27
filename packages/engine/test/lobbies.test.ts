import { describe, expect, it } from "vitest"

import { Game } from "../src/game"
import {
  computeLobbyBaselines,
  defaultLobbies,
  driftLobbies,
  lobbyApprovalContribution,
} from "../src/lobbies"
import { defaultProjectEconomics, type Project } from "../src/projects"
import { useDeterministicEngine, tickDays } from "./helpers"

useDeterministicEngine({
  startDate: new Date("2026-05-21T08:00:00.000Z"),
  seed: 27,
})

function projectOf(kind: Project["kind"]): Project {
  const days = 365
  return {
    id: `p-${kind}`,
    kind,
    name: `${kind} project`,
    description: "",
    location: { label: "Paris", latitude: 48.85, longitude: 2.35 },
    startedAt: "2026-05-21T00:00:00.000Z",
    expectedDurationDays: days,
    ...defaultProjectEconomics(kind, days),
  }
}

describe("computeLobbyBaselines", () => {
  it("nuclear projects lift industry and depress ecology", () => {
    const base = Game.createNew()
    const game = base.addProject(projectOf("construction:nuclear"))
    const targets = computeLobbyBaselines(game)
    const neutral = computeLobbyBaselines(base)
    expect(targets.industry).toBeGreaterThan(neutral.industry)
    expect(targets.ecology).toBeLessThan(neutral.ecology)
  })

  it("civilian projects lift unions and ecology", () => {
    const base = Game.createNew()
    const game = base.addProject(projectOf("construction:civilian"))
    const targets = computeLobbyBaselines(game)
    const neutral = computeLobbyBaselines(base)
    expect(targets.unions).toBeGreaterThan(neutral.unions)
    expect(targets.ecology).toBeGreaterThanOrEqual(neutral.ecology)
  })

  it("deep deficit drags public_sector down", () => {
    const game = Game.createNew().with({ treasury: -250_000 })
    const targets = computeLobbyBaselines(game)
    expect(targets.public_sector).toBeLessThan(50)
  })
})

describe("driftLobbies", () => {
  it("moves current values toward the baseline", () => {
    const current = defaultLobbies()
    const baselines = { ...current, unions: 80, ecology: 20 }
    const next = driftLobbies(current, baselines, 30)
    expect(next.unions).toBeGreaterThan(current.unions)
    expect(next.ecology).toBeLessThan(current.ecology)
  })
})

describe("lobbyApprovalContribution", () => {
  it("returns positive when groups are happy", () => {
    const contribution = lobbyApprovalContribution({
      unions: 80,
      industry: 80,
      ecology: 80,
      military: 80,
      public_sector: 80,
    })
    expect(contribution).toBeGreaterThan(0)
  })

  it("returns negative when groups are unhappy", () => {
    const contribution = lobbyApprovalContribution({
      unions: 10,
      industry: 10,
      ecology: 10,
      military: 10,
      public_sector: 10,
    })
    expect(contribution).toBeLessThan(0)
  })

  it("returns zero in the middle band", () => {
    expect(
      lobbyApprovalContribution({
        unions: 50,
        industry: 50,
        ecology: 50,
        military: 50,
        public_sector: 50,
      })
    ).toBe(0)
  })
})

describe("Game.tick", () => {
  it("drifts lobbies persistently across ticks", () => {
    let game = Game.createNew().with({ paused: false })
    game = game.addProject(projectOf("construction:industrial"))
    const startIndustry = game.lobbies.industry
    game = tickDays(game, 30)
    expect(game.lobbies.industry).toBeGreaterThan(startIndustry)
  })
})
