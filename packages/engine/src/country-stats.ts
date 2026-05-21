import type { NationCode } from "./game"

export interface Demographics {
  population: number
  medianAge: number
  birthRatePer1000: number
  deathRatePer1000: number
  lifeExpectancy: number
  urbanizationPct: number
}

export interface Economy {
  gdpUsd: number
  gdpPerCapitaUsd: number
  unemploymentPct: number
  inflationPct: number
  publicDebtPctGdp: number
}

export interface Government {
  type: string
  headOfState: string
  headOfGovernment: string
  capital: string
}

export interface CountryStats {
  code: NationCode
  name: string
  asOf: string
  demographics: Demographics
  economy: Economy
  government: Government
}

const INITIAL_STATS: Record<NationCode, CountryStats> = {
  FR: {
    code: "FR",
    name: "France",
    asOf: "2026-01-01",
    demographics: {
      population: 69_100_000,
      medianAge: 42.5,
      birthRatePer1000: 9.3,
      deathRatePer1000: 9.4,
      lifeExpectancy: 83.1,
      urbanizationPct: 82.0,
    },
    economy: {
      gdpUsd: 3_600_000_000_000,
      gdpPerCapitaUsd: 52_083,
      unemploymentPct: 7.9,
      inflationPct: 0.8,
      publicDebtPctGdp: 115.6,
    },
    government: {
      type: "Semi-presidential republic",
      headOfState: "Emmanuel Macron",
      headOfGovernment: "Sébastien Lecornu",
      capital: "Paris",
    },
  },
}

export class CountryStatsProvider {
  async fetch(code: NationCode): Promise<CountryStats> {
    const stats = INITIAL_STATS[code]
    if (!stats) {
      throw new Error(`No initial stats available for nation: ${code}`)
    }
    return structuredClone(stats)
  }

  fetchSync(code: NationCode): CountryStats {
    const stats = INITIAL_STATS[code]
    if (!stats) {
      throw new Error(`No initial stats available for nation: ${code}`)
    }
    return structuredClone(stats)
  }

  has(code: NationCode): boolean {
    return code in INITIAL_STATS
  }
}
