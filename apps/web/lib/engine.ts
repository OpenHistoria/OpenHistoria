import {
  Engine,
  LocalStorageGameStore,
  SupabaseGameStore,
  type GameStore,
} from "@workspace/engine"

import { getOpenRouterKey } from "@/lib/openrouter"
import {
  ensureGuestSession,
  getSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase"

/**
 * App-wide engine instance. Games persist to Supabase when it is configured
 * (guest session created automatically on first use), and fall back to this
 * browser's localStorage otherwise. Turns are always powered by the
 * player's own OpenRouter key.
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

export const engine = new Engine({
  store,
  getApiKey: getOpenRouterKey,
})
