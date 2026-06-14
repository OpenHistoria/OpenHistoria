"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { Result } from "better-result"

import {
  DEFAULT_MODEL,
  ROTATE_FREE_MODELS,
  toTimeline,
  type DecisionOption,
  type Game,
  type GameDate,
  type GameDecision,
  type GameEvent,
  type JumpSpan,
  type ScheduledEvent,
} from "@workspace/engine"

import { useI18n } from "@/hooks/use-i18n"
import { useOpenRouterModels } from "@/hooks/use-openrouter-models"
import { engine } from "@/lib/engine"
import { formatTurnError } from "@/lib/i18n"
import { rankFreeModels } from "@/lib/openrouter-models"

export type { JumpSpan }

/**
 * The narrated outcome of one Jump Forward: the briefing plus the events that
 * happened during the span, played back to the player as a sequence of cards.
 * A decision raised by the jump is held here and surfaced after playback.
 */
export interface JumpReport {
  from: GameDate
  to: GameDate
  narration: string
  events: GameEvent[]
  decision: GameDecision | null
}

interface GameSession {
  game: Game
  /** The current in-game date. Time is frozen here between jumps. */
  displayDate: GameDate
  events: GameEvent[]
  narration: string | null
  nextScheduled: ScheduledEvent | null
  directives: string[]
  addDirective: (text: string) => void
  removeDirective: (index: number) => void
  clearDirectives: () => void
  /** A jump (or advisor call) is in flight. */
  busy: boolean
  error: string | null
  completed: boolean
  selectedEvent: GameEvent | null
  selectedEventPos: { x: number; y: number } | null
  selectEvent: (event: GameEvent | null, pos?: { x: number; y: number }) => void
  /** Advance time by the given span; the model simulates the world's response. */
  jump: (span: JumpSpan) => Promise<void>
  changeModel: (modelId: string) => Promise<void>
  /** The latest jump's playback, or null when there is nothing to report. */
  report: JumpReport | null
  dismissReport: () => void
  pendingDecision: GameDecision | null
  resolveDecision: (option: DecisionOption) => void
  dismissDecision: () => void
  /** Per-call model choice (no rotation), used by side calls like the advisor. */
  modelSelection: () => { modelOverride?: string; fallbackModels?: string[] }
}

const GameSessionContext = createContext<GameSession | null>(null)

/**
 * Owns one game's state under the Jump Forward model: time is frozen at the
 * game's current date and only moves when the player jumps. A jump runs the
 * engine over the chosen span and returns a report (narration + events) that
 * the HUD plays back. Mounted keyed on game.id, so switching games starts
 * fresh.
 */
export function GameSessionProvider({
  game,
  onGameChange,
  children,
}: {
  game: Game
  onGameChange: (game: Game) => void
  children: ReactNode
}) {
  const { t } = useI18n()
  const { models } = useOpenRouterModels()
  const [events, setEvents] = useState<GameEvent[]>([])
  const [narration, setNarration] = useState<string | null>(null)
  const [scheduled, setScheduled] = useState<ScheduledEvent[]>([])
  const [directives, setDirectivesState] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<JumpReport | null>(null)
  const [pendingDecision, setPendingDecision] = useState<GameDecision | null>(
    null
  )
  const [selectedEvent, setSelectedEvent] = useState<GameEvent | null>(null)
  const [selectedEventPos, setSelectedEventPos] = useState<{
    x: number
    y: number
  } | null>(null)

  const selectEvent = (
    event: GameEvent | null,
    pos?: { x: number; y: number }
  ) => {
    setSelectedEvent(event)
    if (pos) setSelectedEventPos(pos)
  }

  // Read directives inside the stable jump callback so editing them does not
  // re-create it. Round-robin cursor for free-model rotation.
  const directivesRef = useRef<string[]>([])
  const runningRef = useRef(false)
  const rotationRef = useRef(0)

  const updateDirectives = (next: string[]) => {
    directivesRef.current = next
    setDirectivesState(next)
  }
  const addDirective = (text: string) => {
    const trimmed = text.trim()
    if (trimmed) updateDirectives([...directivesRef.current, trimmed])
  }
  const removeDirective = (index: number) => {
    updateDirectives(directivesRef.current.filter((_, i) => i !== index))
  }
  const clearDirectives = () => updateDirectives([])

  const completed = game.status === "completed"

  // Free models ranked best-first; used to fill fallbacks and rotation.
  const rankedFree = useMemo(
    () => rankFreeModels(models).map((m) => m.id),
    [models]
  )

  // Load the timeline, the latest narration, and pending scheduled events so a
  // resumed game shows where the player left off.
  useEffect(() => {
    let active = true
    void (async () => {
      const timeline = await engine.getTimeline(game.id)
      if (active && timeline.isOk()) setEvents(timeline.value)

      const pending = await engine.getScheduled(game.id)
      if (active && pending.isOk()) setScheduled(pending.value)

      const messages = await engine.getMessages(game.id)
      if (!active || messages.isErr()) return
      const lastAssistant = [...messages.value]
        .reverse()
        .find((m) => m.role === "assistant")
      if (!lastAssistant) return
      const parsed = Result.try(
        () => JSON.parse(lastAssistant.content) as { narration?: string }
      ).unwrapOr(null)
      if (parsed?.narration) setNarration(parsed.narration)
    })()
    return () => {
      active = false
    }
  }, [game.id])

  // A non-rotating model choice, used for side calls (the advisor) that should
  // not consume the turn rotation cursor.
  const modelSelection = useCallback((): {
    modelOverride?: string
    fallbackModels?: string[]
  } => {
    if (game.model === ROTATE_FREE_MODELS) {
      return {
        modelOverride: rankedFree[0] ?? DEFAULT_MODEL,
        fallbackModels: rankedFree.slice(1, 3),
      }
    }
    if (models.find((m) => m.id === game.model)?.free) {
      return {
        fallbackModels: rankedFree.filter((id) => id !== game.model).slice(0, 2),
      }
    }
    return {}
  }, [game.model, models, rankedFree])

  const jump = useCallback(
    async (span: JumpSpan) => {
      if (runningRef.current || completed) return
      runningRef.current = true
      setBusy(true)
      setError(null)
      const orders = directivesRef.current
      const from = game.currentDate

      // Pick this jump's model. In rotate mode, round-robin through free models;
      // otherwise let OpenRouter fall back to other free models when on a free one.
      let modelOverride: string | undefined
      let fallbackModels: string[] | undefined
      if (game.model === ROTATE_FREE_MODELS) {
        const primary = rankedFree.length
          ? rankedFree[rotationRef.current % rankedFree.length]
          : undefined
        rotationRef.current += 1
        modelOverride = primary ?? DEFAULT_MODEL
        fallbackModels = rankedFree.filter((id) => id !== primary).slice(0, 2)
      } else if (models.find((m) => m.id === game.model)?.free) {
        fallbackModels = rankedFree.filter((id) => id !== game.model).slice(0, 2)
      }

      const result = await engine.advanceTime(game.id, {
        jump: span,
        playerAction: orders.length
          ? orders.map((d) => `- ${d}`).join("\n")
          : undefined,
        fallbackModels,
        modelOverride,
      })
      runningRef.current = false
      setBusy(false)
      result.match({
        ok: (turn) => {
          setEvents((prev) => toTimeline([...prev, ...turn.events]))
          setNarration(turn.narration)
          if (orders.length) updateDirectives([])
          setReport({
            from,
            to: turn.game.currentDate,
            narration: turn.narration,
            events: toTimeline(turn.events),
            decision: turn.decision,
          })
          void engine
            .getScheduled(game.id)
            .then((r) => r.isOk() && setScheduled(r.value))
          onGameChange(turn.game)
        },
        err: (e) => setError(formatTurnError(t, e)),
      })
    },
    [completed, game.id, game.currentDate, game.model, models, rankedFree, onGameChange, t]
  )

  // Closing the report surfaces any decision the jump raised, as a focused
  // prompt; resolving it queues the choice as the next jump's directive.
  const dismissReport = () => {
    setPendingDecision(report?.decision ?? null)
    setReport(null)
  }

  const resolveDecision = (option: DecisionOption) => {
    const title = pendingDecision?.title ?? "the decision"
    addDirective(
      `In response to "${title}", we choose: ${option.label}. ${option.detail}`
    )
    setPendingDecision(null)
  }
  const dismissDecision = () => setPendingDecision(null)

  const changeModel = useCallback(
    async (modelId: string) => {
      if (modelId === game.model) return
      const updated = await engine.setGameModel(game.id, modelId)
      if (updated.isOk()) onGameChange(updated.value)
    },
    [game.id, game.model, onGameChange]
  )

  const value: GameSession = {
    game,
    displayDate: game.currentDate,
    events,
    narration,
    nextScheduled: scheduled[0] ?? null,
    directives,
    addDirective,
    removeDirective,
    clearDirectives,
    busy,
    error,
    completed,
    selectedEvent,
    selectedEventPos,
    selectEvent,
    jump,
    changeModel,
    report,
    dismissReport,
    pendingDecision,
    resolveDecision,
    dismissDecision,
    modelSelection,
  }

  return (
    <GameSessionContext.Provider value={value}>
      {children}
    </GameSessionContext.Provider>
  )
}

export function useGameSession(): GameSession {
  const value = useContext(GameSessionContext)
  if (!value) {
    throw new Error("useGameSession must be used within a GameSessionProvider")
  }
  return value
}
