"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { Locale } from "@/lib/i18n"

type SpeechState = "idle" | "loading" | "playing" | "unsupported" | "error"

type PocketSpeakOptions = {
  text: string
  locale: Locale
  signal: AbortSignal
}

type PocketAdapter = {
  speak?: (options: PocketSpeakOptions) => Promise<unknown> | unknown
  createPocketTtsEngine?: () => Promise<PocketAdapter> | PocketAdapter
}

const POCKET_ADAPTER_PATH = "/tts/pocket/adapter.js"

const canUseWasm = () =>
  typeof WebAssembly === "object" &&
  typeof WebAssembly.instantiate === "function"

const canUseSpeechSynthesis = () =>
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  "SpeechSynthesisUtterance" in window

const loadPocketAdapter = async (): Promise<PocketAdapter | null> => {
  if (!canUseWasm()) return null
  try {
    // Public runtime asset, intentionally invisible to the Next bundler.
    const importRuntime = new Function("path", "return import(path)") as (
      path: string
    ) => Promise<PocketAdapter & { default?: PocketAdapter }>
    const mod = await importRuntime(POCKET_ADAPTER_PATH)
    const adapter = mod.default ?? mod
    return adapter.createPocketTtsEngine
      ? await adapter.createPocketTtsEngine()
      : adapter
  } catch {
    return null
  }
}

const speakWithBrowser = (
  text: string,
  locale: Locale,
  signal: AbortSignal
) =>
  new Promise<void>((resolve, reject) => {
    if (!canUseSpeechSynthesis()) {
      reject(new Error("Speech synthesis is not supported."))
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = locale === "fr" ? "fr-FR" : "en-US"
    utterance.rate = 0.95
    utterance.pitch = 1

    const cleanup = () => {
      signal.removeEventListener("abort", onAbort)
      utterance.onend = null
      utterance.onerror = null
    }
    const onAbort = () => {
      cleanup()
      window.speechSynthesis.cancel()
      resolve()
    }

    utterance.onend = () => {
      cleanup()
      resolve()
    }
    utterance.onerror = () => {
      cleanup()
      reject(new Error("Speech synthesis failed."))
    }
    signal.addEventListener("abort", onAbort)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  })

export function useSpeechReader(locale: Locale) {
  const adapterRef = useRef<Promise<PocketAdapter | null> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [state, setState] = useState<SpeechState>("idle")
  const runtimeSupported = canUseWasm() || canUseSpeechSynthesis()

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (canUseSpeechSynthesis()) window.speechSynthesis.cancel()
    }
  }, [])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    if (canUseSpeechSynthesis()) window.speechSynthesis.cancel()
    setState("idle")
  }, [])

  const speak = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      if (!runtimeSupported) {
        setState("unsupported")
        return
      }
      if (state === "playing" || state === "loading") {
        stop()
        return
      }

      const controller = new AbortController()
      abortRef.current = controller
      setState("loading")

      try {
        adapterRef.current ??= loadPocketAdapter()
        const adapter = await adapterRef.current
        if (controller.signal.aborted) return

        setState("playing")
        if (adapter?.speak) {
          await adapter.speak({
            text: trimmed,
            locale,
            signal: controller.signal,
          })
        } else {
          await speakWithBrowser(trimmed, locale, controller.signal)
        }

        if (!controller.signal.aborted) setState("idle")
      } catch {
        if (!controller.signal.aborted) setState("error")
      } finally {
        if (abortRef.current === controller) abortRef.current = null
      }
    },
    [locale, runtimeSupported, state, stop]
  )

  return {
    state,
    supported: runtimeSupported,
    busy: state === "loading" || state === "playing",
    speak,
    stop,
  }
}
