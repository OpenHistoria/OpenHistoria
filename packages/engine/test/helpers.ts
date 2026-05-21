import { afterEach, beforeEach } from "vitest"

import { makeDeterministicClock, resetClock, setClock, type Clock } from "../src/clock"
import { Game } from "../src/game"

export interface TestHarness {
  clock: Clock & { advance: (ms: number) => void; counter: () => number }
}

export function useDeterministicEngine(
  opts: { startDate?: Date; seed?: number; idPrefix?: string } = {}
): TestHarness {
  const harness: TestHarness = {
    clock: makeDeterministicClock({ idPrefix: "id", ...opts }),
  }

  beforeEach(() => {
    harness.clock = makeDeterministicClock({ idPrefix: "id", ...opts })
    setClock(harness.clock)
  })

  afterEach(() => {
    resetClock()
  })

  return harness
}

export function freshGame(): Game {
  return Game.createNew()
}

export function tickDays(game: Game, days: number): Game {
  return game.tick(days)
}
