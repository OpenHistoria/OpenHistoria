import { Engine, LocalStorageCaseStore } from "@workspace/detective-engine"

import {
  getLlmApiKey,
  getLlmBaseUrl,
  getLlmModelOverride,
} from "@/games/casefile/lib/llm-provider"

/**
 * App-wide engine instance. Cases persist to this browser's localStorage.
 * Rounds are powered by the player's own OpenRouter key, or by a local
 * OpenAI-compatible provider when one is configured (see lib/llm-provider).
 */
const localModel = getLlmModelOverride()

export const engine = new Engine({
  store: new LocalStorageCaseStore(),
  getApiKey: getLlmApiKey,
  getBaseUrl: getLlmBaseUrl,
  ...(localModel ? { model: localModel } : {}),
})
