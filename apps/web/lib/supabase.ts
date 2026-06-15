import {
  createClient,
  type Session,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js"
import { Result, TaggedError } from "better-result"

/**
 * Supabase client + account lifecycle.
 *
 * Players never see a login wall: the first time the app needs the
 * database, ensureGuestSession signs them in anonymously. Later they can
 * attach an email (upgradeGuestToAccount) which converts the same auth user
 * into a permanent account, so every game, message, and event they created
 * as a guest stays theirs.
 *
 * When the NEXT_PUBLIC_SUPABASE_* env vars are unset the app runs without
 * Supabase entirely and games stay in localStorage (see lib/engine.ts).
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

/** The NEXT_PUBLIC_SUPABASE_* env vars are not set. */
export class SupabaseNotConfiguredError extends TaggedError(
  "SupabaseNotConfigured"
)() {}

/** Anonymous sign-in failed (auth service down, anonymous sign-ins off...). */
export class GuestSignInFailedError extends TaggedError("GuestSignInFailed")<{
  message: string
}>() {}

/** Attaching an email to the guest account failed. */
export class AccountUpgradeFailedError extends TaggedError(
  "AccountUpgradeFailed"
)<{ message: string }>() {}

let client: SupabaseClient | null = null

/** Lazily created singleton; throws only when Supabase is unconfigured. */
export function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new SupabaseNotConfiguredError()
  }
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  return client
}

/**
 * Returns the current session, creating an anonymous (guest) one when the
 * browser has none. Safe to call before every database operation; it only
 * hits the network when there is no session yet.
 */
export const ensureGuestSession = (): Promise<
  Result<Session, SupabaseNotConfiguredError | GuestSignInFailedError>
> =>
  Result.gen(async function* () {
    if (!isSupabaseConfigured) {
      return Result.err(new SupabaseNotConfiguredError())
    }
    const supabase = getSupabase()

    const existing = yield* Result.await(
      Result.tryPromise({
        try: () => supabase.auth.getSession(),
        catch: () => new GuestSignInFailedError({ message: "network" }),
      })
    )
    if (existing.data.session) {
      return Result.ok(existing.data.session)
    }

    const anonymous = yield* Result.await(
      Result.tryPromise({
        try: () => supabase.auth.signInAnonymously(),
        catch: () => new GuestSignInFailedError({ message: "network" }),
      })
    )
    if (anonymous.error || !anonymous.data.session) {
      return Result.err(
        new GuestSignInFailedError({
          message: anonymous.error?.message ?? "no session returned",
        })
      )
    }
    return Result.ok(anonymous.data.session)
  })

/**
 * Converts the current guest into a permanent account by attaching an
 * email. Supabase sends a confirmation link; once the player clicks it the
 * same auth user (and therefore all their games) becomes a real account.
 * They can add a password afterwards with updateUser({ password }).
 */
export const upgradeGuestToAccount = (
  email: string
): Promise<
  Result<void, SupabaseNotConfiguredError | AccountUpgradeFailedError>
> =>
  Result.gen(async function* () {
    if (!isSupabaseConfigured) {
      return Result.err(new SupabaseNotConfiguredError())
    }
    const supabase = getSupabase()
    const updated = yield* Result.await(
      Result.tryPromise({
        try: () => supabase.auth.updateUser({ email }),
        catch: () => new AccountUpgradeFailedError({ message: "network" }),
      })
    )
    if (updated.error) {
      return Result.err(
        new AccountUpgradeFailedError({ message: updated.error.message })
      )
    }
    return Result.ok(undefined)
  })

export type AccountKind = "guest" | "account"

export const accountKind = (user: User): AccountKind =>
  user.is_anonymous ? "guest" : "account"

/**
 * Subscribes to auth changes (guest created, account upgraded, signed
 * out...). Returns an unsubscribe function; no-op when unconfigured.
 */
export function onAccountChange(
  listener: (user: User | null) => void
): () => void {
  if (!isSupabaseConfigured) return () => undefined
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
    listener(session?.user ?? null)
  })
  return () => data.subscription.unsubscribe()
}
