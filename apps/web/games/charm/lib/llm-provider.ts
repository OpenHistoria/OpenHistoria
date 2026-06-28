import { getOpenRouterKey } from "@/games/charm/lib/openrouter"

/**
 * Local provider override for the seduction engine.
 *
 * By default Open Charm drives the encounter through OpenRouter with the
 * player's own key. For local or self-hosted setups you can instead point the
 * engine at any OpenAI-compatible chat-completions endpoint - Ollama, a LiteLLM
 * proxy, vLLM, LM Studio, etc. - and bypass OpenRouter entirely.
 *
 * Configure via env (baked at build time) or localStorage (read at runtime and
 * taking precedence):
 *
 *   base URL  NEXT_PUBLIC_LLM_BASE_URL  / localStorage "openhistoria:llm-base-url"
 *   api key   NEXT_PUBLIC_LLM_API_KEY   / localStorage "openhistoria:llm-api-key"
 *   model     NEXT_PUBLIC_LLM_MODEL     / localStorage "openhistoria:llm-model"
 */

export const LLM_BASE_URL_STORAGE_KEY = "openhistoria:llm-base-url"
export const LLM_API_KEY_STORAGE_KEY = "openhistoria:llm-api-key"
export const LLM_MODEL_STORAGE_KEY = "openhistoria:llm-model"

// localStorage throws in Safari private mode and when storage is blocked;
// treat the value as absent rather than crashing.
const readLocal = (key: string): string | null => {
  if (typeof window === "undefined") return null
  try {
    const value = window.localStorage.getItem(key)
    return value && value.trim() ? value.trim() : null
  } catch {
    return null
  }
}

const envOrLocal = (
  envValue: string | undefined,
  storageKey: string
): string | null => readLocal(storageKey) ?? envValue?.trim() ?? null

/**
 * The OpenAI-compatible API root to use instead of OpenRouter, or null to use
 * OpenRouter. Presence of a value is what flips the engine into local mode.
 */
export const getLlmBaseUrl = (): string | null =>
  envOrLocal(process.env.NEXT_PUBLIC_LLM_BASE_URL, LLM_BASE_URL_STORAGE_KEY)

/** Whether a local provider override is configured. */
export const isLocalProvider = (): boolean => getLlmBaseUrl() !== null

/**
 * Key the engine sends as the Bearer token. When a local provider is
 * configured, use its key (often none, e.g. Ollama); otherwise fall back to
 * the player's stored OpenRouter key.
 */
export const getLlmApiKey = (): string | null => {
  if (isLocalProvider()) {
    return envOrLocal(
      process.env.NEXT_PUBLIC_LLM_API_KEY,
      LLM_API_KEY_STORAGE_KEY
    )
  }
  return getOpenRouterKey()
}

/** Model id new flirtations default to when a local provider is configured. */
export const getLlmModelOverride = (): string | null =>
  envOrLocal(process.env.NEXT_PUBLIC_LLM_MODEL, LLM_MODEL_STORAGE_KEY)
