export interface Clock {
  now(): Date
  uuid(): string
  random(): number
}

export const realClock: Clock = {
  now: () => new Date(),
  uuid: () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID()
    }
    return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  },
  random: () => Math.random(),
}

let currentClock: Clock = realClock

export function setClock(clock: Clock): void {
  currentClock = clock
}

export function resetClock(): void {
  currentClock = realClock
}

export function getClock(): Clock {
  return currentClock
}

export function seededRandom(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x1_0000_0000
  }
}

export function makeDeterministicClock(opts: {
  startDate?: Date
  seed?: number
  idPrefix?: string
}): Clock & { advance: (ms: number) => void; counter: () => number } {
  let date = opts.startDate ? new Date(opts.startDate.getTime()) : new Date("2026-05-21T00:00:00.000Z")
  const rand = seededRandom(opts.seed ?? 1)
  let counter = 0
  return {
    now: () => new Date(date.getTime()),
    uuid: () => `${opts.idPrefix ?? "test"}-${++counter}`,
    random: () => rand(),
    advance: (ms: number) => {
      date = new Date(date.getTime() + ms)
    },
    counter: () => counter,
  }
}
