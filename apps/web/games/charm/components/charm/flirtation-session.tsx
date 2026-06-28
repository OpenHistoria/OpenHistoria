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
  toEncounter,
  type Beat,
  type Flirtation,
  type MoodState,
} from "@workspace/seduction-engine"

import { engine } from "@/games/charm/lib/engine"
import { formatAdvanceError } from "@/games/charm/lib/errors"

interface FlirtationSession {
  flirtation: Flirtation
  /** Every beat so far, oldest first. */
  beats: Beat[]
  /** The most recent beat, or null before the opening is generated. */
  currentBeat: Beat | null
  /** How the encounter currently stands (from the latest beat). */
  state: MoodState
  /** A beat generation is in flight. */
  busy: boolean
  error: string | null
  /** True once the encounter has reached an ending. */
  ended: boolean
  /**
   * Makes a move and advances the encounter one beat. With no move it
   * generates the opening (or retries it).
   */
  advance: (move?: string) => Promise<void>
  /** Retries the last move that failed, if any. */
  retry: () => Promise<void>
  canRetry: boolean
}

const FlirtationSessionContext = createContext<FlirtationSession | null>(null)

/**
 * Owns one flirtation's state. On mount it loads the encounter so far and, when
 * the flirtation has no beats yet, generates the opening automatically. Mounted
 * keyed on flirtation.id, so switching flirtations starts fresh.
 */
export function FlirtationSessionProvider({
  flirtation,
  onFlirtationChange,
  children,
}: {
  flirtation: Flirtation
  onFlirtationChange: (flirtation: Flirtation) => void
  children: ReactNode
}) {
  const [beats, setBeats] = useState<Beat[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastMove, setLastMove] = useState<string | undefined>(undefined)
  const [canRetry, setCanRetry] = useState(false)

  const runningRef = useRef(false)
  // Guards the one-time opening auto-generation per mounted flirtation.
  const openedRef = useRef(false)

  const ended = flirtation.status === "ended"
  const currentBeat = beats[beats.length - 1] ?? null
  const state = currentBeat?.state ?? EMPTY_STATE

  const advance = useCallback(
    async (move?: string) => {
      if (runningRef.current) return
      runningRef.current = true
      setBusy(true)
      setError(null)
      setLastMove(move)

      const result = await engine.advance(flirtation.id, { move })
      runningRef.current = false
      setBusy(false)
      result.match({
        ok: ({ flirtation: updated, beat }) => {
          setBeats((prev) => toEncounter([...prev, beat]))
          setCanRetry(false)
          onFlirtationChange(updated)
        },
        err: (e) => {
          setError(formatAdvanceError(e))
          setCanRetry(true)
        },
      })
    },
    [flirtation.id, onFlirtationChange]
  )

  const retry = useCallback(async () => {
    await advance(lastMove)
  }, [advance, lastMove])

  // Load the encounter so far, then generate the opening if there is none yet.
  useEffect(() => {
    let active = true
    void (async () => {
      const loaded = await engine.getEncounter(flirtation.id)
      if (!active) return
      const existing = loaded.isOk() ? loaded.value : []
      setBeats(existing)
      if (existing.length === 0 && !openedRef.current && !ended) {
        openedRef.current = true
        void advance()
      }
    })()
    return () => {
      active = false
    }
    // advance is stable for a given flirtation id; ended only flips after the
    // encounter already has beats, so the opening guard is unaffected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flirtation.id])

  const value: FlirtationSession = {
    flirtation,
    beats,
    currentBeat,
    state,
    busy,
    error,
    ended,
    advance,
    retry,
    canRetry,
  }

  return (
    <FlirtationSessionContext.Provider value={value}>
      {children}
    </FlirtationSessionContext.Provider>
  )
}

export function useFlirtationSession(): FlirtationSession {
  const value = useContext(FlirtationSessionContext)
  if (!value) {
    throw new Error(
      "useFlirtationSession must be used within a FlirtationSessionProvider"
    )
  }
  return value
}
