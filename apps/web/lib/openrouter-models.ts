import { Result } from "better-result"

/**
 * The OpenRouter model catalog (https://openrouter.ai/api/v1/models). Public,
 * no key required. The engine drives every turn with a strict JSON schema
 * (structured outputs), so the list is filtered to models that advertise that
 * capability - others would fail mid-game.
 */

const MODELS_URL = "https://openrouter.ai/api/v1/models"

export interface OpenRouterModel {
  id: string
  name: string
  /** USD per million prompt / completion tokens (0 for free models). */
  promptPricePerM: number
  completionPricePerM: number
  contextLength: number
  free: boolean
}

interface RawModel {
  id: string
  name?: string
  context_length?: number
  pricing?: { prompt?: string; completion?: string }
  supported_parameters?: string[]
}

const perMillion = (perToken: string | undefined): number =>
  Math.round((Number(perToken ?? "0") || 0) * 1_000_000 * 100) / 100

let cache: OpenRouterModel[] | null = null

/** Fetches and caches the structured-output-capable model catalog. */
export async function fetchModels(): Promise<
  Result<OpenRouterModel[], "ModelsUnavailable">
> {
  if (cache) return Result.ok(cache)

  const fetched = await Result.tryPromise({
    try: async () => {
      const res = await fetch(MODELS_URL)
      if (!res.ok) throw new Error(String(res.status))
      return (await res.json()) as { data?: RawModel[] }
    },
    catch: () => "ModelsUnavailable" as const,
  })
  if (fetched.isErr()) return Result.err(fetched.error)

  const models = (fetched.value.data ?? [])
    .filter((m) => m.supported_parameters?.includes("structured_outputs"))
    .map<OpenRouterModel>((m) => {
      const promptPricePerM = perMillion(m.pricing?.prompt)
      const completionPricePerM = perMillion(m.pricing?.completion)
      return {
        id: m.id,
        name: m.name ?? m.id,
        promptPricePerM,
        completionPricePerM,
        contextLength: m.context_length ?? 0,
        free: promptPricePerM === 0 && completionPricePerM === 0,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  cache = models
  return Result.ok(models)
}

// Families that tend to be the strongest free options; earlier = preferred.
const PREFERRED_FREE_FAMILIES = [
  "deepseek",
  "llama-4",
  "llama-3.3",
  "qwen3",
  "qwen-2.5",
  "gemini",
  "glm",
  "mistral",
]

const freeScore = (m: OpenRouterModel) => {
  const id = m.id.toLowerCase()
  const family = PREFERRED_FREE_FAMILIES.findIndex((p) => id.includes(p))
  const familyScore =
    family === -1 ? 0 : (PREFERRED_FREE_FAMILIES.length - family) * 10_000_000
  return familyScore + m.contextLength
}

/** Free, structured-output-capable models, best first (heuristic ranking). */
export function rankFreeModels(models: OpenRouterModel[]): OpenRouterModel[] {
  return models.filter((m) => m.free).sort((a, b) => freeScore(b) - freeScore(a))
}

/**
 * Picks the "best" free, structured-output-capable model: biased toward known
 * capable families, then the largest context window. Returns null if none are
 * free. Heuristic, not a benchmark - free models come and go on OpenRouter.
 */
export function pickBestFreeModel(
  models: OpenRouterModel[]
): OpenRouterModel | null {
  return rankFreeModels(models)[0] ?? null
}
