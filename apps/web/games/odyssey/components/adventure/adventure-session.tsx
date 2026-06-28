"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

import {
  EMPTY_STATE,
  toStory,
  type Adventure,
  type Scene,
  type StoryState,
} from "@workspace/adventure-engine"

import { engine } from "@/games/odyssey/lib/engine"
import { formatAdvanceError } from "@/games/odyssey/lib/errors"

interface AdventureSession {
  adventure: Adventure
  /** Every scene so far, oldest first. */
  scenes: Scene[]
  /** The most recent scene, or null before the opening is generated. */
  currentScene: Scene | null
  /** The protagonist's current state (from the latest scene). */
  state: StoryState
  /** A scene generation is in flight. */
  busy: boolean
  error: string | null
  /** True once the story has reached an ending. */
  ended: boolean
  /**
   * Takes an action and advances the story one scene. With no action it
   * generates the opening (or retries it).
   */
  advance: (action?: string) => Promise<void>
  /** Retries the last action that failed, if any. */
  retry: () => Promise<void>
  canRetry: boolean
}

const AdventureSessionContext = createContext<AdventureSession | null>(null)

/**
 * Owns one adventure's state. On mount it loads the story so far and, when the
 * adventure has no scenes yet, generates the opening automatically. Mounted
 * keyed on adventure.id, so switching adventures starts fresh.
 */
export function AdventureSessionProvider({
  adventure,
  onAdventureChange,
  children,
}: {
  adventure: Adventure
  onAdventureChange: (adventure: Adventure) => void
  children: ReactNode
}) {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastAction, setLastAction] = useState<string | undefined>(undefined)
  const [canRetry, setCanRetry] = useState(false)

  const runningRef = useRef(false)
  // Guards the one-time opening auto-generation per mounted adventure.
  const openedRef = useRef(false)

  const ended = adventure.status === "ended"
  const currentScene = scenes[scenes.length - 1] ?? null
  const state = currentScene?.state ?? EMPTY_STATE

  const advance = useCallback(
    async (action?: string) => {
      if (runningRef.current) return
      runningRef.current = true
      setBusy(true)
      setError(null)
      setLastAction(action)

      const result = await engine.advance(adventure.id, { action })
      runningRef.current = false
      setBusy(false)
      result.match({
        ok: ({ adventure: updated, scene }) => {
          setScenes((prev) => toStory([...prev, scene]))
          setCanRetry(false)
          onAdventureChange(updated)
        },
        err: (e) => {
          setError(formatAdvanceError(e))
          setCanRetry(true)
        },
      })
    },
    [adventure.id, onAdventureChange]
  )

  const retry = useCallback(async () => {
    await advance(lastAction)
  }, [advance, lastAction])

  // Load the story so far, then generate the opening if there is none yet.
  useEffect(() => {
    let active = true
    void (async () => {
      const loaded = await engine.getStory(adventure.id)
      if (!active) return
      const existing = loaded.isOk() ? loaded.value : []
      setScenes(existing)
      if (existing.length === 0 && !openedRef.current && !ended) {
        openedRef.current = true
        void advance()
      }
    })()
    return () => {
      active = false
    }
    // advance is stable for a given adventure id; ended only flips after the
    // story already has scenes, so the opening guard is unaffected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adventure.id])

  const value: AdventureSession = {
    adventure,
    scenes,
    currentScene,
    state,
    busy,
    error,
    ended,
    advance,
    retry,
    canRetry,
  }

  return (
    <AdventureSessionContext.Provider value={value}>
      {children}
    </AdventureSessionContext.Provider>
  )
}

export function useAdventureSession(): AdventureSession {
  const value = useContext(AdventureSessionContext)
  if (!value) {
    throw new Error(
      "useAdventureSession must be used within an AdventureSessionProvider"
    )
  }
  return value
}
