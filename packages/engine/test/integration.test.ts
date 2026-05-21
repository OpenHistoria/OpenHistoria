import { describe, expect, it } from "vitest"

import { Game } from "../src/game"
import { defaultProjectEconomics, type Project } from "../src/projects"
import { useDeterministicEngine } from "./helpers"

useDeterministicEngine({
  startDate: new Date("2026-05-21T08:00:00.000Z"),
  seed: 7,
})

function projectAt(date: Date): Project {
  const kind = "construction:civilian"
  const days = 30
  return {
    id: `proj-${date.toISOString()}`,
    kind,
    name: `Library opening ${date.toISOString().slice(0, 10)}`,
    description: "",
    location: { label: "Nantes", latitude: 47.218, longitude: -1.553 },
    startedAt: date.toISOString(),
    expectedDurationDays: days,
    ...defaultProjectEconomics(kind, days),
  }
}

describe("end-to-end simulation", () => {
  it("runs a year of game time without crashing and reaches game over", () => {
    let game = Game.createNew().with({ paused: false })
    const project = projectAt(game.date)
    game = game.addProject(project)

    let safety = 5000
    while (!game.gameOver && safety-- > 0) {
      if (game.pendingEvent) {
        const event = game.pendingEvent
        const choice = event.choices[0]!
        game = game.resolveEventChoice(event.id, choice.id)
        game = game.with({ paused: false })
        continue
      }
      game = game.tick(7)
    }

    expect(game.gameOver).not.toBeNull()
    expect(game.triggeredEvents.length).toBeGreaterThanOrEqual(1)
    expect(safety).toBeGreaterThan(0)
  })

  it("preserves immutability of the original Game instance across ticks", () => {
    const game = Game.createNew().with({ paused: false })
    const snapshot = game.toSnapshot()
    game.tick(10)
    expect(game.toSnapshot()).toEqual(snapshot)
  })
})
