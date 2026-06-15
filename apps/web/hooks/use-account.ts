"use client"

import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"

import {
  accountKind,
  ensureGuestSession,
  isSupabaseConfigured,
  onAccountChange,
} from "@/lib/supabase"

export type AccountStatus =
  /** Supabase env vars unset: games stay in localStorage. */
  "local" | "loading" | "guest" | "account"

export interface AccountState {
  status: AccountStatus
  /** Set once upgraded to a real account. */
  email: string | null
  user: User | null
}

/**
 * Tracks the player's Supabase identity. On first use it creates a guest
 * (anonymous) session, and it follows the upgrade to a real account live
 * via onAuthStateChange.
 */
export function useAccount(): AccountState {
  const [state, setState] = useState<AccountState>({
    status: isSupabaseConfigured ? "loading" : "local",
    email: null,
    user: null,
  })

  useEffect(() => {
    if (!isSupabaseConfigured) return

    const apply = (user: User | null) => {
      setState({
        status: user ? accountKind(user) : "loading",
        email: user?.email ?? null,
        user,
      })
    }

    const unsubscribe = onAccountChange(apply)
    void ensureGuestSession().then((session) => {
      session.match({
        ok: (s) => apply(s.user),
        err: () => undefined,
      })
    })
    return unsubscribe
  }, [])

  return state
}
