import { countryName } from "./countries"
import type { FetchedCountryData } from "./country-data"
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

/**
 * World-average defaults used when synthesising stats for a country that has
 * no curated roster entry. Deliberately plausible-but-generic so any of the
 * ~190 ISO countries is immediately playable offline; the live World Bank
 * fetch (see `buildCountryStats`) replaces these with real figures when the
 * web app has network access.
 */
function defaultStatsFor(code: string, name?: string): CountryStats {
  const upper = code.trim().toUpperCase()
  const display = name ?? countryName(upper)
  const population = 20_000_000
  const gdpPerCapita = 15_000
  return {
    code: upper,
    name: display,
    asOf: "2026-01-01",
    demographics: {
      population,
      medianAge: 32,
      birthRatePer1000: 17,
      deathRatePer1000: 8,
      lifeExpectancy: 73,
      urbanizationPct: 58,
    },
    economy: {
      gdpUsd: population * gdpPerCapita,
      gdpPerCapitaUsd: gdpPerCapita,
      unemploymentPct: 6.5,
      inflationPct: 4,
      publicDebtPctGdp: 60,
    },
    government: {
      type: "Republic",
      headOfState: `${display} head of state`,
      headOfGovernment: `${display} head of government`,
      capital: "—",
    },
  }
}

export class CountryStatsProvider {
  /** Roster lookup; never throws — synthesises generic stats for unknown codes. */
  async fetch(code: NationCode): Promise<CountryStats> {
    return this.fetchSync(code)
  }

  fetchSync(code: NationCode): CountryStats {
    const key = String(code).trim().toUpperCase()
    const stats = INITIAL_STATS[key]
    if (stats) return structuredClone(stats)
    return defaultStatsFor(key)
  }

  /** True only when a curated (hand-authored) roster entry exists. */
  has(code: NationCode): boolean {
    return String(code).trim().toUpperCase() in INITIAL_STATS
  }
}

/**
 * Build a full `CountryStats` from live World Bank / REST Countries data
 * (`FetchedCountryData`) plus optional leader names. Any indicator the fetch
 * couldn't supply falls back to the generic world-average defaults, so the
 * result is always complete and engine-safe.
 */
export function buildCountryStats(
  fetched: FetchedCountryData,
  leaders?: { headOfState?: string | null; headOfGovernment?: string | null }
): CountryStats {
  const base = defaultStatsFor(fetched.code, fetched.name)
  const d = fetched.demographics
  const e = fetched.economy
  const population = d.population?.value ?? base.demographics.population
  const gdpUsd = e.gdpUsd?.value ?? base.economy.gdpUsd
  const gdpPerCapitaUsd =
    e.gdpPerCapitaUsd?.value ??
    (population > 0 ? gdpUsd / population : base.economy.gdpPerCapitaUsd)
  return {
    code: fetched.code.toUpperCase(),
    name: fetched.name,
    asOf: fetched.asOf,
    demographics: {
      population,
      medianAge: base.demographics.medianAge,
      birthRatePer1000:
        d.birthRatePer1000?.value ?? base.demographics.birthRatePer1000,
      deathRatePer1000:
        d.deathRatePer1000?.value ?? base.demographics.deathRatePer1000,
      lifeExpectancy:
        d.lifeExpectancy?.value ?? base.demographics.lifeExpectancy,
      urbanizationPct:
        d.urbanizationPct?.value ?? base.demographics.urbanizationPct,
    },
    economy: {
      gdpUsd,
      gdpPerCapitaUsd,
      unemploymentPct:
        e.unemploymentPct?.value ?? base.economy.unemploymentPct,
      inflationPct: e.inflationPct?.value ?? base.economy.inflationPct,
      publicDebtPctGdp:
        e.publicDebtPctGdp?.value ?? base.economy.publicDebtPctGdp,
    },
    government: {
      type: base.government.type,
      headOfState:
        leaders?.headOfState?.trim() || base.government.headOfState,
      headOfGovernment:
        leaders?.headOfGovernment?.trim() ||
        leaders?.headOfState?.trim() ||
        base.government.headOfGovernment,
      capital: fetched.capital ?? base.government.capital,
    },
  }
}

/** Generic synthesised stats for an ISO code, used for offline new games. */
export function synthesizeCountryStats(
  code: string,
  name?: string
): CountryStats {
  return defaultStatsFor(code, name)
}
