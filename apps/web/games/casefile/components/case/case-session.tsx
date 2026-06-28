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
  toInvestigation,
  type Case,
  type CaseState,
  type Round,
} from "@workspace/detective-engine"

import { engine } from "@/games/casefile/lib/engine"
import { formatAccuseError, formatAdvanceError } from "@/games/casefile/lib/errors"
import { getPreferFreeRotation } from "@/games/casefile/lib/openrouter"
import { OPENROUTER_FREE_MODEL } from "@workspace/engine"

const freeModelOpts = () =>
  getPreferFreeRotation()
    ? { modelOverride: OPENROUTER_FREE_MODEL, fallbackModels: [] as string[] }
    : {}

interface CaseSession {
  theCase: Case
  /** Every round so far, oldest first. */
  rounds: Round[]
  /** The most recent round, or null before the opening is generated. */
  currentRound: Round | null
  /** The investigation state (from the latest round). */
  state: CaseState
  /** A round or accusation is in flight. */
  busy: boolean
  error: string | null
  /** True once the case has been closed (solved or failed). */
  closed: boolean
  /**
   * Takes an action and advances the investigation one round. With no action
   * it generates the opening (or retries it).
   */
  advance: (action?: string) => Promise<void>
  /** Names a culprit and resolves the case. */
  accuse: (input: { accused: string; reasoning?: string }) => Promise<void>
  /** Retries the last action that failed, if any. */
  retry: () => Promise<void>
  canRetry: boolean
}

const CaseSessionContext = createContext<CaseSession | null>(null)

/**
 * Owns one case's state. On mount it loads the investigation so far and, when
 * the case has no rounds yet, generates the opening automatically. Mounted
 * keyed on case.id, so switching cases starts fresh.
 */
export function CaseSessionProvider({
  theCase,
  onCaseChange,
  children,
}: {
  theCase: Case
  onCaseChange: (theCase: Case) => void
  children: ReactNode
}) {
  const [rounds, setRounds] = useState<Round[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastAction, setLastAction] = useState<string | undefined>(undefined)
  const [canRetry, setCanRetry] = useState(false)

  const runningRef = useRef(false)
  // Guards the one-time opening auto-generation per mounted case.
  const openedRef = useRef(false)

  const closed = theCase.status !== "active"
  const currentRound = rounds[rounds.length - 1] ?? null
  const state = currentRound?.state ?? EMPTY_STATE

  const advance = useCallback(
    async (action?: string) => {
      if (runningRef.current) return
      runningRef.current = true
      setBusy(true)
      setError(null)
      setLastAction(action)

      const result = await engine.advance(theCase.id, {
        action,
        ...freeModelOpts(),
      })
      runningRef.current = false
      setBusy(false)
      result.match({
        ok: ({ case: updated, round }) => {
          setRounds((prev) => toInvestigation([...prev, round]))
          setCanRetry(false)
          onCaseChange(updated)
        },
        err: (e) => {
          setError(formatAdvanceError(e))
          setCanRetry(true)
        },
      })
    },
    [theCase.id, onCaseChange]
  )

  const accuse = useCallback(
    async ({ accused, reasoning }: { accused: string; reasoning?: string }) => {
      if (runningRef.current) return
      runningRef.current = true
      setBusy(true)
      setError(null)
      setLastAction(undefined)

      const result = await engine.accuse(theCase.id, {
        accused,
        reasoning,
        ...freeModelOpts(),
      })
      runningRef.current = false
      setBusy(false)
      result.match({
        ok: ({ case: updated, round }) => {
          setRounds((prev) => toInvestigation([...prev, round]))
          setCanRetry(false)
          onCaseChange(updated)
        },
        err: (e) => {
          setError(formatAccuseError(e))
          setCanRetry(false)
        },
      })
    },
    [theCase.id, onCaseChange]
  )

  const retry = useCallback(async () => {
    await advance(lastAction)
  }, [advance, lastAction])

  // Load the investigation so far, then generate the opening if none yet.
  useEffect(() => {
    let active = true
    void (async () => {
      const loaded = await engine.getInvestigation(theCase.id)
      if (!active) return
      const existing = loaded.isOk() ? loaded.value : []
      setRounds(existing)
      if (existing.length === 0 && !openedRef.current && !closed) {
        openedRef.current = true
        void advance()
      }
    })()
    return () => {
      active = false
    }
    // advance is stable for a given case id; closed only flips after the case
    // already has rounds, so the opening guard is unaffected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theCase.id])

  const value: CaseSession = {
    theCase,
    rounds,
    currentRound,
    state,
    busy,
    error,
    closed,
    advance,
    accuse,
    retry,
    canRetry,
  }

  return (
    <CaseSessionContext.Provider value={value}>
      {children}
    </CaseSessionContext.Provider>
  )
}

export function useCaseSession(): CaseSession {
  const value = useContext(CaseSessionContext)
  if (!value) {
    throw new Error("useCaseSession must be used within a CaseSessionProvider")
  }
  return value
}
