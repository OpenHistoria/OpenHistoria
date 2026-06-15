import {
  Engine,
  LocalStorageGameStore,
  SupabaseGameStore,
  type GameStore,
} from "@workspace/engine"

import {
  getLlmApiKey,
  getLlmBaseUrl,
  getLlmModelOverride,
} from "@/lib/llm-provider"
import {
  ensureGuestSession,
  getSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase"

/**
 * App-wide engine instance. Games persist to Supabase when it is configured
 * (guest session created automatically on first use), and fall back to this
 * browser's localStorage otherwise. Turns are powered by the player's own
 * OpenRouter key, or by a local OpenAI-compatible provider when one is
 * configured (see lib/llm-provider).
 */
const store: GameStore = isSupabaseConfigured
  ? new SupabaseGameStore({
      acquireClient: async () => {
        const session = await ensureGuestSession()
        if (session.isErr()) throw session.error
        return getSupabase()
      },
    })
  : new LocalStorageGameStore()

const localModel = getLlmModelOverride()

export const engine = new Engine({
  store,
  getApiKey: getLlmApiKey,
  getBaseUrl: getLlmBaseUrl,
  // When pointed at a local provider, default new games to its model id;
  // otherwise leave the engine's OpenRouter default in place.
  ...(localModel ? { model: localModel } : {}),
})
