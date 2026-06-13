"use client"

import { useEffect, useState } from "react"

import { fetchModels, type OpenRouterModel } from "@/lib/openrouter-models"

interface ModelsState {
  models: OpenRouterModel[]
  loading: boolean
  error: boolean
}

/** Loads the (cached) OpenRouter model catalog for pickers. */
export function useOpenRouterModels(): ModelsState {
  const [state, setState] = useState<ModelsState>({
    models: [],
    loading: true,
    error: false,
  })

  useEffect(() => {
    let active = true
    void (async () => {
      const result = await fetchModels()
      if (!active) return
      result.match({
        ok: (models) => setState({ models, loading: false, error: false }),
        err: () => setState({ models: [], loading: false, error: true }),
      })
    })()
    return () => {
      active = false
    }
  }, [])

  return state
}
