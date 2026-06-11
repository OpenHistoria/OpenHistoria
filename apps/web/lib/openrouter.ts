import { Result, TaggedError } from "better-result"

/**
 * OpenRouter PKCE OAuth flow (https://openrouter.ai/docs).
 *
 * Players bring their own OpenRouter account: we redirect them to
 * openrouter.ai with an S256 code challenge, they authorize Open Historia,
 * and we exchange the returned code for an app-scoped API key. That key is
 * stored in this browser only and is never sent to our servers; players can
 * cap or revoke it anytime from their OpenRouter dashboard.
 *
 * All fallible operations return Results with tagged errors; the UI maps
 * tags to localized messages via formatOpenRouterError in lib/i18n.
 */

const KEY_STORAGE_KEY = "openhistoria:openrouter-key"
const VERIFIER_STORAGE_KEY = "openhistoria:openrouter-verifier"

/** Fired on window whenever the stored key changes in this tab. */
export const OPENROUTER_KEY_CHANGED_EVENT =
  "openhistoria:openrouter-key-changed"

export const OPENROUTER_DASHBOARD_URL = "https://openrouter.ai/settings/keys"

const AUTH_URL = "https://openrouter.ai/auth"
const EXCHANGE_URL = "https://openrouter.ai/api/v1/auth/keys"
const KEY_INFO_URL = "https://openrouter.ai/api/v1/key"

/** The PKCE verifier vanished (storage cleared, or callback opened cold). */
export class OpenRouterAuthExpiredError extends TaggedError(
  "OpenRouterAuthExpired"
)() {}

/** OpenRouter refused to trade the authorization code for a key. */
export class OpenRouterExchangeFailedError extends TaggedError(
  "OpenRouterExchangeFailed"
)<{ status: number }>() {}

/** The exchange succeeded but the response carried no key. */
export class OpenRouterNoKeyReturnedError extends TaggedError(
  "OpenRouterNoKeyReturned"
)() {}

/** The request never reached OpenRouter (offline, DNS, CORS...). */
export class OpenRouterNetworkError extends TaggedError(
  "OpenRouterNetworkError"
)() {}

/** OpenRouter answered with an unexpected HTTP error. */
export class OpenRouterRequestFailedError extends TaggedError(
  "OpenRouterRequestFailed"
)<{ status: number }>() {}

export type OpenRouterAuthError =
  | OpenRouterAuthExpiredError
  | OpenRouterExchangeFailedError
  | OpenRouterNoKeyReturnedError
  | OpenRouterNetworkError

export type OpenRouterKeyInfoError =
  | OpenRouterNetworkError
  | OpenRouterRequestFailedError

export type OpenRouterError = OpenRouterAuthError | OpenRouterKeyInfoError

const tryFetch = (input: string, init?: RequestInit) =>
  Result.tryPromise({
    try: () => fetch(input, init),
    catch: () => new OpenRouterNetworkError(),
  })

const tryJson = <T>(response: Response) =>
  Result.tryPromise({
    try: () => response.json() as Promise<T>,
    catch: () => new OpenRouterNetworkError(),
  })

const base64UrlEncode = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

const sha256Challenge = async (verifier: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  )
  return base64UrlEncode(new Uint8Array(digest))
}

export const callbackUrl = () => `${window.location.origin}/openrouter/callback`

/**
 * Starts the PKCE flow: stores a fresh verifier and navigates to the
 * OpenRouter authorization page. The browser leaves the app here; the flow
 * resumes on /openrouter/callback.
 */
export async function beginOpenRouterAuth(): Promise<void> {
  const verifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)))
  sessionStorage.setItem(VERIFIER_STORAGE_KEY, verifier)

  const url = new URL(AUTH_URL)
  url.searchParams.set("callback_url", callbackUrl())
  url.searchParams.set("code_challenge", await sha256Challenge(verifier))
  url.searchParams.set("code_challenge_method", "S256")
  window.location.href = url.toString()
}

/**
 * Exchanges the authorization code for an app-scoped API key and stores it.
 */
export const completeOpenRouterAuth = (
  code: string
): Promise<Result<void, OpenRouterAuthError>> =>
  Result.gen(async function* () {
    const verifier = sessionStorage.getItem(VERIFIER_STORAGE_KEY)
    if (!verifier) {
      return Result.err(new OpenRouterAuthExpiredError())
    }

    const response = yield* Result.await(
      tryFetch(EXCHANGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          code_verifier: verifier,
          code_challenge_method: "S256",
        }),
      })
    )
    if (!response.ok) {
      return Result.err(
        new OpenRouterExchangeFailedError({ status: response.status })
      )
    }

    const { key } = yield* Result.await(tryJson<{ key?: string }>(response))
    if (!key) {
      return Result.err(new OpenRouterNoKeyReturnedError())
    }

    sessionStorage.removeItem(VERIFIER_STORAGE_KEY)
    storeOpenRouterKey(key)
    return Result.ok(undefined)
  })

// localStorage throws in Safari private mode and when storage is blocked;
// treat the key as absent rather than crashing the UI.
export const getOpenRouterKey = (): string | null =>
  Result.try(() => window.localStorage.getItem(KEY_STORAGE_KEY)).unwrapOr(null)

export const storeOpenRouterKey = (key: string) => {
  Result.try(() => window.localStorage.setItem(KEY_STORAGE_KEY, key))
  window.dispatchEvent(new Event(OPENROUTER_KEY_CHANGED_EVENT))
}

export const clearOpenRouterKey = () => {
  Result.try(() => window.localStorage.removeItem(KEY_STORAGE_KEY))
  window.dispatchEvent(new Event(OPENROUTER_KEY_CHANGED_EVENT))
}

export interface OpenRouterKeyInfo {
  label: string | null
  /** Credits already spent through this key, in USD. */
  usage: number
  /** Spending cap for this key in USD, or null when uncapped. */
  limit: number | null
  isFreeTier: boolean
}

/**
 * Fetches metadata about the stored key. Resolves to Ok(null) when the key
 * has been revoked or is otherwise invalid (the caller should treat that as
 * disconnected).
 */
export const fetchOpenRouterKeyInfo = (
  key: string
): Promise<Result<OpenRouterKeyInfo | null, OpenRouterKeyInfoError>> =>
  Result.gen(async function* () {
    const response = yield* Result.await(
      tryFetch(KEY_INFO_URL, {
        headers: { Authorization: `Bearer ${key}` },
      })
    )
    if (response.status === 401 || response.status === 403) {
      return Result.ok(null)
    }
    if (!response.ok) {
      return Result.err(
        new OpenRouterRequestFailedError({ status: response.status })
      )
    }

    const { data } = yield* Result.await(
      tryJson<{
        data: {
          label?: string | null
          usage?: number
          limit?: number | null
          is_free_tier?: boolean
        }
      }>(response)
    )
    return Result.ok({
      label: data.label ?? null,
      usage: data.usage ?? 0,
      limit: data.limit ?? null,
      isFreeTier: data.is_free_tier ?? false,
    })
  })
