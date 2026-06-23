import {
  Engine,
  LocalStorageAdventureStore,
} from "@workspace/adventure-engine"

import {
  getLlmApiKey,
  getLlmBaseUrl,
  getLlmModelOverride,
} from "@/lib/llm-provider"

/**
 * App-wide engine instance. Adventures persist to this browser's
 * localStorage. Scenes are powered by the player's own OpenRouter key, or by a
 * local OpenAI-compatible provider when one is configured (see
 * lib/llm-provider).
 */
const localModel = getLlmModelOverride()

export const engine = new Engine({
  store: new LocalStorageAdventureStore(),
  getApiKey: getLlmApiKey,
  getBaseUrl: getLlmBaseUrl,
  ...(localModel ? { model: localModel } : {}),
})
