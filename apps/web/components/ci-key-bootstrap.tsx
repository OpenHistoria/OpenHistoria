"use client"

import { useEffect } from "react"

import { applyOpenRouterKeyFromUrl } from "@/lib/openrouter"

/**
 * Runs once on load: if the URL carries an `or_key` param (used by the CI
 * screenshot agent to skip the OAuth flow), store it, switch to the free-model
 * rotation, and scrub the key from the URL. No-op for normal players.
 */
export function CiKeyBootstrap() {
  useEffect(() => {
    applyOpenRouterKeyFromUrl()
  }, [])
  return null
}
