import {
  Engine,
  LocalStorageFlirtationStore,
} from "@workspace/seduction-engine"

import {
  getLlmApiKey,
  getLlmBaseUrl,
  getLlmModelOverride,
} from "@/games/charm/lib/llm-provider"

/**
 * App-wide engine instance. Flirtations persist to this browser's
 * localStorage. Beats are powered by the player's own OpenRouter key, or by a
 * local OpenAI-compatible provider when one is configured (see
 * lib/llm-provider).
 */
const localModel = getLlmModelOverride()

export const engine = new Engine({
  store: new LocalStorageFlirtationStore(),
  getApiKey: getLlmApiKey,
  getBaseUrl: getLlmBaseUrl,
  ...(localModel ? { model: localModel } : {}),
})
