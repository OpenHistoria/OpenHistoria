import { afterEach, describe, expect, it } from "vitest"

import {
  getClock,
  makeDeterministicClock,
  realClock,
  resetClock,
  seededRandom,
  setClock,
} from "../src/clock"

afterEach(() => {
  resetClock()
})

describe("seededRandom", () => {
  it("returns the same sequence for the same seed", () => {
    const a = seededRandom(123)
    const b = seededRandom(123)
    const seqA = Array.from({ length: 5 }, () => a())
    const seqB = Array.from({ length: 5 }, () => b())
    expect(seqA).toEqual(seqB)
  })

  it("returns values in [0, 1)", () => {
    const rand = seededRandom(42)
    for (let i = 0; i < 100; i++) {
      const v = rand()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe("setClock / getClock / resetClock", () => {
  it("returns realClock by default", () => {
    expect(getClock()).toBe(realClock)
  })

  it("swaps in a test clock and restores via resetClock", () => {
    const test = makeDeterministicClock({ seed: 1 })
    setClock(test)
    expect(getClock()).toBe(test)
    resetClock()
    expect(getClock()).toBe(realClock)
  })
})

describe("makeDeterministicClock", () => {
  it("yields stable monotonic ids", () => {
    const clock = makeDeterministicClock({ idPrefix: "x" })
    expect(clock.uuid()).toBe("x-1")
    expect(clock.uuid()).toBe("x-2")
    expect(clock.counter()).toBe(2)
  })

  it("advances date by ms", () => {
    const start = new Date("2026-01-01T00:00:00.000Z")
    const clock = makeDeterministicClock({ startDate: start })
    expect(clock.now().getTime()).toBe(start.getTime())
    clock.advance(86_400_000)
    expect(clock.now().getTime()).toBe(start.getTime() + 86_400_000)
  })
})
