"use client"

import { useEffect, useState, useSyncExternalStore } from "react"

import {
  OPENROUTER_KEY_CHANGED_EVENT,
  clearOpenRouterKey,
  fetchOpenRouterKeyInfo,
  getOpenRouterKey,
  type OpenRouterKeyInfo,
  type OpenRouterKeyInfoError,
} from "@/lib/openrouter"

export type OpenRouterStatus = "loading" | "disconnected" | "connected"

export interface OpenRouterConnection {
  status: OpenRouterStatus
  /** Populated once the key has been validated against the OpenRouter API. */
  keyInfo: OpenRouterKeyInfo | null
  /** Set when the key exists but its metadata could not be fetched. */
  infoError: OpenRouterKeyInfoError | null
  disconnect: () => void
}

const subscribeToKey = (onChange: () => void) => {
  window.addEventListener(OPENROUTER_KEY_CHANGED_EVENT, onChange)
  // Picks up connects/disconnects done in another tab.
  window.addEventListener("storage", onChange)
  return () => {
    window.removeEventListener(OPENROUTER_KEY_CHANGED_EVENT, onChange)
    window.removeEventListener("storage", onChange)
  }
}

// Sentinel server snapshot: localStorage is unreadable during SSR, so the
// first render reports "loading" instead of flashing the connect prompt.
const LOADING = Symbol("loading")
const getServerKey = () => LOADING as typeof LOADING | string | null

/**
 * Tracks whether this browser holds an OpenRouter key and validates it
 * against the API. A revoked key is cleared automatically so the UI falls
 * back to the connect prompt instead of failing later mid-game.
 */
export function useOpenRouter(): OpenRouterConnection {
  const key = useSyncExternalStore(
    subscribeToKey,
    getOpenRouterKey,
    getServerKey
  )
  const [keyInfo, setKeyInfo] = useState<OpenRouterKeyInfo | null>(null)
  const [infoError, setInfoError] = useState<OpenRouterKeyInfoError | null>(
    null
  )

  useEffect(() => {
    if (typeof key !== "string") return
    let cancelled = false
    void fetchOpenRouterKeyInfo(key).then((result) => {
      if (cancelled) return
      result.match({
        ok: (info) => {
          if (info === null) {
            // Key was revoked from the OpenRouter dashboard.
            clearOpenRouterKey()
            return
          }
          setKeyInfo(info)
        },
        err: setInfoError,
      })
    })
    return () => {
      cancelled = true
    }
  }, [key])

  const connected = typeof key === "string"
  return {
    status:
      key === LOADING ? "loading" : connected ? "connected" : "disconnected",
    keyInfo: connected ? keyInfo : null,
    infoError: connected ? infoError : null,
    disconnect: clearOpenRouterKey,
  }
}
