import { getOpenRouterKey } from "@/lib/openrouter"

/**
 * Local provider override for the turn engine.
 *
 * By default Open Historia drives turns through OpenRouter with the player's
 * own key. For local or self-hosted setups you can instead point the engine at
 * any OpenAI-compatible chat-completions endpoint - Ollama, a LiteLLM proxy,
 * vLLM, LM Studio, etc. - and bypass OpenRouter entirely.
 *
 * Configure via env (baked at build time) or localStorage (read at runtime and
 * taking precedence, handy for quick local experiments):
 *
 *   base URL  NEXT_PUBLIC_LLM_BASE_URL   / localStorage "openhistoria:llm-base-url"
 *   api key   NEXT_PUBLIC_LLM_API_KEY    / localStorage "openhistoria:llm-api-key"
 *   model     NEXT_PUBLIC_LLM_MODEL      / localStorage "openhistoria:llm-model"
 *
 * The base URL is the OpenAI-compatible API root (the engine appends
 * "/chat/completions"). Examples:
 *
 *   Ollama    NEXT_PUBLIC_LLM_BASE_URL=http://localhost:11434/v1
 *             NEXT_PUBLIC_LLM_MODEL=llama3.1            (no key needed)
 *   LiteLLM   NEXT_PUBLIC_LLM_BASE_URL=http://localhost:4000/v1
 *             NEXT_PUBLIC_LLM_MODEL=gpt-4o-mini  NEXT_PUBLIC_LLM_API_KEY=sk-...
 *
 * Note: the model is the local provider's id, so set NEXT_PUBLIC_LLM_MODEL -
 * the in-app model picker lists OpenRouter's catalog, which does not apply to a
 * local endpoint.
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
    return envOrLocal(process.env.NEXT_PUBLIC_LLM_API_KEY, LLM_API_KEY_STORAGE_KEY)
  }
  return getOpenRouterKey()
}

/** Model id new games should default to when a local provider is configured. */
export const getLlmModelOverride = (): string | null =>
  envOrLocal(process.env.NEXT_PUBLIC_LLM_MODEL, LLM_MODEL_STORAGE_KEY)
