import type { NationCode } from "./game"

export interface Minister {
  id: string
  role: string
  name: string
  party: string
  portfolio: string
}

const FR_CABINET: Minister[] = [
  {
    id: "pm",
    role: "Prime Minister",
    name: "Sébastien Lecornu",
    party: "Renaissance",
    portfolio: "Coordinates government, sets legislative agenda.",
  },
  {
    id: "finance",
    role: "Minister of Economy & Finance",
    name: "Antoine Armand",
    party: "Renaissance",
    portfolio: "Budget, taxes, public debt, industrial policy.",
  },
  {
    id: "interior",
    role: "Minister of the Interior",
    name: "Bruno Retailleau",
    party: "Les Républicains",
    portfolio: "Public order, immigration, local governance.",
  },
  {
    id: "foreign",
    role: "Minister for Europe & Foreign Affairs",
    name: "Jean-Noël Barrot",
    party: "MoDem",
    portfolio: "Diplomacy, EU policy, treaty negotiations.",
  },
  {
    id: "defence",
    role: "Minister of Armed Forces",
    name: "Sébastien Lecornu",
    party: "Renaissance",
    portfolio: "Defence procurement, OPEX, nuclear deterrent.",
  },
  {
    id: "justice",
    role: "Minister of Justice",
    name: "Didier Migaud",
    party: "Independent",
    portfolio: "Courts, prisons, judicial reform.",
  },
  {
    id: "labour",
    role: "Minister of Labour & Health",
    name: "Astrid Panosyan-Bouvet",
    party: "Renaissance",
    portfolio: "Pensions, employment, public health.",
  },
  {
    id: "ecology",
    role: "Minister of Ecological Transition",
    name: "Agnès Pannier-Runacher",
    party: "Renaissance",
    portfolio: "Energy, climate, biodiversity.",
  },
]

const REGISTRY: Record<NationCode, Minister[]> = {
  FR: FR_CABINET,
}

export function listMinisters(nation: NationCode): Minister[] {
  return (REGISTRY[nation] ?? []).map((m) => ({ ...m }))
}
