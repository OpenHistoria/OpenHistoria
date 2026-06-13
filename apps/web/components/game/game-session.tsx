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
  addDays,
  addMonths,
  compareGameDates,
  DEFAULT_MODEL,
  minGameDate,
  ROTATE_FREE_MODELS,
  toTimeline,
  type DecisionOption,
  type Game,
  type GameDate,
  type GameDecision,
  type GameEvent,
  type ScheduledEvent,
} from "@workspace/engine"

import { useI18n } from "@/hooks/use-i18n"
import { useOpenRouterModels } from "@/hooks/use-openrouter-models"
import { engine } from "@/lib/engine"
import { formatTurnError } from "@/lib/i18n"
import { rankFreeModels } from "@/lib/openrouter-models"

/** Game speed 1-5: higher means the daily clock ticks faster. */
export type GameSpeed = 1 | 2 | 3 | 4 | 5
export const GAME_SPEEDS: readonly GameSpeed[] = [1, 2, 3, 4, 5]

// The clock ticks every TICK_MS, advancing the displayed date by this many
// in-game days. The AI generates months in the background, ahead of the
// clock, so the date streams forward instead of stalling on each turn.
const TICK_MS = 140
const DAYS_PER_TICK: Record<GameSpeed, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 8,
  5: 16,
}

// How many months of events to keep generated ahead of the visible clock.
// Two means the month the player is about to enter is already there, so the
// date keeps moving while the next month is being written in the background.
// Generation stops short of an unresolved decision, so a choice still steers
// what comes after it (at most this many months are committed un-steered).
const GENERATION_LEAD_MONTHS = 2

/** Whole months `b` is ahead of `a`, ignoring the day. */
const monthsAhead = (a: GameDate, b: GameDate): number =>
  b.year * 12 + b.month - (a.year * 12 + a.month)

/** A model narration tagged with the date through which it summarizes. */
interface NarrationEntry {
  through: GameDate
  text: string
}

/** A decision generated ahead of the clock, held until its month is reached. */
interface BufferedDecision {
  through: GameDate
  decision: GameDecision
}

interface GameSession {
  game: Game
  /** The live, day-by-day ticking date shown to the player. */
  displayDate: GameDate
  events: GameEvent[]
  narration: string | null
  nextScheduled: ScheduledEvent | null
  directives: string[]
  addDirective: (text: string) => void
  removeDirective: (index: number) => void
  busy: boolean
  error: string | null
  completed: boolean
  selectedEvent: GameEvent | null
  selectedEventPos: { x: number; y: number } | null
  selectEvent: (event: GameEvent | null, pos?: { x: number; y: number }) => void
  paused: boolean
  setPaused: (paused: boolean) => void
  speed: GameSpeed
  setSpeed: (speed: GameSpeed) => void
  advance: () => Promise<void>
  changeModel: (modelId: string) => Promise<void>
  pendingDecision: GameDecision | null
  resolveDecision: (option: DecisionOption) => void
  dismissDecision: () => void
}

const GameSessionContext = createContext<GameSession | null>(null)

/**
 * Owns one game's turn state and its real-time-style clock. The visible date
 * is decoupled from the generation frontier (game.currentDate): a background
 * loop keeps generating months ahead, and the daily clock streams forward
 * through whatever has been generated, only ever waiting if generation falls
 * behind. Events and narration are revealed strictly by the visible date, so
 * the buffered-ahead future never spoils what the player has not reached yet.
 * Mounted keyed on game.id, so switching games starts fresh.
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
  // The full generated timeline; the player only sees events up to displayDate.
  const [events, setEvents] = useState<GameEvent[]>([])
  const [narrations, setNarrations] = useState<NarrationEntry[]>([])
  const [scheduled, setScheduled] = useState<ScheduledEvent[]>([])
  const [directives, setDirectivesState] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Start paused so Play (and the AI credits it spends) is always deliberate.
  const [paused, setPaused] = useState(true)
  const [speed, setSpeed] = useState<GameSpeed>(3)
  // The display clock ticks daily, clamped to the generation frontier. Seeded
  // from the game (provider is keyed per id), so a resume catches straight up.
  const [displayDate, setDisplayDate] = useState<GameDate>(game.currentDate)
  // A decision generated ahead of the clock waits here until its month plays.
  const [bufferedDecision, setBufferedDecision] =
    useState<BufferedDecision | null>(null)
  // The decision surfaces (and the clock halts on it) once the visible date
  // reaches the month that raised it; derived so no extra effect is needed.
  const pendingDecision = useMemo(
    () =>
      bufferedDecision &&
      compareGameDates(displayDate, bufferedDecision.through) >= 0
        ? bufferedDecision.decision
        : null,
    [bufferedDecision, displayDate]
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

  // Read inside the stable generation callback so typing directives or ticking
  // the clock does not re-create it (which would reset the loops).
  const directivesRef = useRef<string[]>([])
  const runningRef = useRef(false)
  // Round-robin cursor when the game rotates between free models.
  const rotationRef = useRef(0)
  // Latest display date / frontier, read by the manual step without making it
  // depend on (and churn with) every tick.
  const displayDateRef = useRef(displayDate)
  const frontierRef = useRef(game.currentDate)
  useEffect(() => {
    displayDateRef.current = displayDate
  }, [displayDate])
  useEffect(() => {
    frontierRef.current = game.currentDate
  }, [game.currentDate])

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

  const completed = game.status === "completed"

  // Load the timeline, latest narration, and pending scheduled events so a
  // resumed game shows where the player left off (caught up to the frontier).
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
      if (parsed?.narration)
        setNarrations([{ through: game.currentDate, text: parsed.narration }])
    })()
    return () => {
      active = false
    }
    // Loads once per game; game.currentDate is read only as the mount-time
    // resume point, so it deliberately stays out of the dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id])

  // Generates one month past the current frontier and persists it, extending
  // the buffer the clock streams through. Returns the new frontier, or null on
  // failure / when one is already in flight. Does not touch the display clock.
  const generateNextMonth = useCallback(async (): Promise<GameDate | null> => {
    if (runningRef.current || game.status === "completed") return null
    runningRef.current = true
    setBusy(true)
    setError(null)
    const orders = directivesRef.current
    const rankedFree = rankFreeModels(models).map((m) => m.id)

    // Pick this turn's model. In rotate mode, round-robin through free models;
    // otherwise let OpenRouter fall back to other free models when on a free one.
    let modelOverride: string | undefined
    let fallbackModels: string[] | undefined
    if (game.model === ROTATE_FREE_MODELS) {
      const primary = rankedFree[rotationRef.current % rankedFree.length]
      rotationRef.current += 1
      modelOverride = primary ?? DEFAULT_MODEL
      fallbackModels = rankedFree.filter((id) => id !== primary).slice(0, 2)
    } else if (models.find((m) => m.id === game.model)?.free) {
      fallbackModels = rankedFree.filter((id) => id !== game.model).slice(0, 2)
    }

    const result = await engine.advanceTime(game.id, {
      playerAction: orders.length
        ? orders.map((d) => `- ${d}`).join("\n")
        : undefined,
      fallbackModels,
      modelOverride,
    })
    runningRef.current = false
    setBusy(false)
    return result.match({
      ok: (turn) => {
        setNarrations((prev) => [
          ...prev,
          { through: turn.game.currentDate, text: turn.narration },
        ])
        setEvents((prev) => toTimeline([...prev, ...turn.events]))
        // The orders that shaped this turn are spent.
        if (orders.length) updateDirectives([])
        // Hold any decision until the clock reaches the month that raised it.
        if (turn.decision) {
          setBufferedDecision({
            through: turn.game.currentDate,
            decision: turn.decision,
          })
        }
        void engine
          .getScheduled(game.id)
          .then((r) => r.isOk() && setScheduled(r.value))
        onGameChange(turn.game)
        return turn.game.currentDate
      },
      err: (e) => {
        setError(formatTurnError(t, e))
        // Stop the clock on failure so a bad key does not loop on errors.
        setPaused(true)
        return null
      },
    })
  }, [game.id, game.status, game.model, models, onGameChange, t])

  // Manual single step: reveal the next month immediately, generating it first
  // if the buffer does not already reach past the clock.
  const advance = useCallback(async () => {
    if (game.status === "completed") return
    let frontier = frontierRef.current
    if (compareGameDates(addMonths(displayDateRef.current, 1), frontier) > 0) {
      const next = await generateNextMonth()
      if (!next) return
      frontier = next
    }
    setDisplayDate((d) => minGameDate(addMonths(d, 1), frontier))
  }, [game.status, generateNextMonth])

  // Resolving feeds the chosen option back as the next period's directive and
  // lets time resume; the background loop then generates with it in hand.
  // Dismissing just ignores it and resumes.
  const resolveDecision = (option: DecisionOption) => {
    const title = pendingDecision?.title ?? "the decision"
    updateDirectives([
      `In response to "${title}", we choose: ${option.label}. ${option.detail}`,
    ])
    setBufferedDecision(null)
    setPaused(false)
  }
  const dismissDecision = () => {
    setBufferedDecision(null)
    setPaused(false)
  }

  const changeModel = useCallback(
    async (modelId: string) => {
      if (modelId === game.model) return
      const updated = await engine.setGameModel(game.id, modelId)
      if (updated.isOk()) onGameChange(updated.value)
    },
    [game.id, game.model, onGameChange]
  )

  // Background generation: keep the frontier GENERATION_LEAD_MONTHS ahead of
  // the visible clock, pausing the look-ahead while a decision is unresolved or
  // still waiting to surface (so the player's choice can shape what follows).
  useEffect(() => {
    if (paused || completed || pendingDecision || bufferedDecision) return
    if (runningRef.current) return
    if (monthsAhead(displayDate, game.currentDate) >= GENERATION_LEAD_MONTHS)
      return
    void generateNextMonth()
  }, [
    paused,
    completed,
    pendingDecision,
    bufferedDecision,
    displayDate,
    game.currentDate,
    generateNextMonth,
  ])

  // The daily clock: while playing, tick the display date forward, clamped to
  // the generation frontier so it never runs past what has been generated. If
  // it catches the frontier it simply waits there for the next month.
  useEffect(() => {
    if (paused || completed || pendingDecision) return
    if (compareGameDates(displayDate, game.currentDate) >= 0) return
    const id = setTimeout(() => {
      setDisplayDate((d) =>
        minGameDate(addDays(d, DAYS_PER_TICK[speed]), game.currentDate)
      )
    }, TICK_MS)
    return () => clearTimeout(id)
  }, [paused, completed, pendingDecision, displayDate, game.currentDate, speed])

  // Only reveal what the clock has reached; the buffered-ahead months stay
  // hidden until their day comes.
  const visibleEvents = useMemo(
    () => events.filter((e) => compareGameDates(e.date, displayDate) <= 0),
    [events, displayDate]
  )
  // The narration for the most recent period the clock has played through.
  const narration = useMemo(() => {
    let text: string | null = null
    for (const entry of narrations) {
      if (compareGameDates(entry.through, displayDate) <= 0) text = entry.text
    }
    return text
  }, [narrations, displayDate])

  const value: GameSession = {
    game,
    displayDate,
    events: visibleEvents,
    narration,
    nextScheduled: scheduled[0] ?? null,
    directives,
    addDirective,
    removeDirective,
    busy,
    error,
    completed,
    selectedEvent,
    selectedEventPos,
    selectEvent,
    paused,
    setPaused,
    speed,
    setSpeed,
    advance,
    changeModel,
    pendingDecision,
    resolveDecision,
    dismissDecision,
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
