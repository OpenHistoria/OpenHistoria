import type { SupabaseClient } from "@supabase/supabase-js"
import { Result } from "better-result"

import {
  StoreReadError,
  StoreWriteError,
  type GameStore,
  type StoreResult,
} from "@workspace/engine/store"
import type {
  ChatMessage,
  ChatRole,
  EventKind,
  Game,
  GameEvent,
  GameStatus,
  ScheduledEvent,
} from "@workspace/engine/types"

/**
 * GameStore backed by Supabase (Postgres + RLS). Each row is owned by the
 * authenticated user (a guest/anonymous session works too); row level
 * security in supabase/migrations keeps players isolated from each other.
 *
 * The client is acquired lazily per operation so the app can make sure a
 * session exists (e.g. sign in anonymously) before the first query runs.
 * Wall-clock timestamps from the domain model (Game.createdAt,
 * ChatMessage.createdAt) are written verbatim as timestamptz columns, so
 * every AI exchange stays timestamped in the database exactly as it
 * happened in the client.
 */
export interface SupabaseGameStoreConfig {
  /** Returns a client with a valid (possibly anonymous) session. */
  acquireClient: () => Promise<SupabaseClient>
}

interface GameRow {
  id: string
  country_code: string
  country_name: string
  start_year: number
  current_year: number
  current_month: number
  current_day: number
  status: string
  model: string
  language: string
  created_at: string
  updated_at: string
}

interface MessageRow {
  id: string
  game_id: string
  role: string
  content: string
  game_year: number
  game_month: number
  game_day: number
  created_at: string
}

interface EventRow {
  id: string
  game_id: string
  year: number
  month: number
  day: number
  end_year: number | null
  end_month: number | null
  end_day: number | null
  title: string
  description: string
  kind: string
  countries: string[]
  lat: number | null
  lng: number | null
  location_label: string | null
  importance: number
  source: string
}

interface ScheduledRow {
  id: string
  game_id: string
  due_year: number
  due_month: number
  due_day: number
  scheduled_year: number
  scheduled_month: number
  scheduled_day: number
  title: string
  description: string
}

const toIso = (ms: number) => new Date(ms).toISOString()
const fromIso = (iso: string) => new Date(iso).getTime()

const gameFromRow = (row: GameRow): Game => ({
  id: row.id,
  countryCode: row.country_code,
  countryName: row.country_name,
  startYear: row.start_year,
  currentDate: {
    year: row.current_year,
    month: row.current_month,
    day: row.current_day,
  },
  status: row.status as GameStatus,
  model: row.model,
  language: row.language,
  createdAt: fromIso(row.created_at),
  updatedAt: fromIso(row.updated_at),
})

const gameToRow = (game: Game): GameRow => ({
  id: game.id,
  country_code: game.countryCode,
  country_name: game.countryName,
  start_year: game.startYear,
  current_year: game.currentDate.year,
  current_month: game.currentDate.month,
  current_day: game.currentDate.day,
  status: game.status,
  model: game.model,
  language: game.language,
  created_at: toIso(game.createdAt),
  updated_at: toIso(game.updatedAt),
})

const messageFromRow = (row: MessageRow): ChatMessage => ({
  id: row.id,
  gameId: row.game_id,
  role: row.role as ChatRole,
  content: row.content,
  gameDate: { year: row.game_year, month: row.game_month, day: row.game_day },
  createdAt: fromIso(row.created_at),
})

const messageToRow = (message: ChatMessage): MessageRow => ({
  id: message.id,
  game_id: message.gameId,
  role: message.role,
  content: message.content,
  game_year: message.gameDate.year,
  game_month: message.gameDate.month,
  game_day: message.gameDate.day,
  created_at: toIso(message.createdAt),
})

const eventFromRow = (row: EventRow): GameEvent => ({
  id: row.id,
  gameId: row.game_id,
  date: { year: row.year, month: row.month, day: row.day },
  endDate:
    row.end_year !== null && row.end_month !== null && row.end_day !== null
      ? { year: row.end_year, month: row.end_month, day: row.end_day }
      : null,
  title: row.title,
  description: row.description,
  kind: row.kind as EventKind,
  countries: row.countries,
  location:
    row.lat !== null && row.lng !== null
      ? { lat: row.lat, lng: row.lng, label: row.location_label ?? "" }
      : null,
  importance: row.importance,
  source: row.source as GameEvent["source"],
})

const eventToRow = (event: GameEvent): EventRow => ({
  id: event.id,
  game_id: event.gameId,
  year: event.date.year,
  month: event.date.month,
  day: event.date.day,
  end_year: event.endDate?.year ?? null,
  end_month: event.endDate?.month ?? null,
  end_day: event.endDate?.day ?? null,
  title: event.title,
  description: event.description,
  kind: event.kind,
  countries: event.countries,
  lat: event.location?.lat ?? null,
  lng: event.location?.lng ?? null,
  location_label: event.location?.label ?? null,
  importance: event.importance,
  source: event.source,
})

const scheduledFromRow = (row: ScheduledRow): ScheduledEvent => ({
  id: row.id,
  gameId: row.game_id,
  dueDate: { year: row.due_year, month: row.due_month, day: row.due_day },
  scheduledAt: {
    year: row.scheduled_year,
    month: row.scheduled_month,
    day: row.scheduled_day,
  },
  title: row.title,
  description: row.description,
})

const scheduledToRow = (event: ScheduledEvent): ScheduledRow => ({
  id: event.id,
  game_id: event.gameId,
  due_year: event.dueDate.year,
  due_month: event.dueDate.month,
  due_day: event.dueDate.day,
  scheduled_year: event.scheduledAt.year,
  scheduled_month: event.scheduledAt.month,
  scheduled_day: event.scheduledAt.day,
  title: event.title,
  description: event.description,
})

export class SupabaseGameStore implements GameStore {
  private readonly acquireClient: () => Promise<SupabaseClient>
  private readonly listeners = new Set<() => void>()

  constructor(config: SupabaseGameStoreConfig) {
    this.acquireClient = config.acquireClient
  }

  private notify() {
    for (const listener of this.listeners) listener()
  }

  private async query<T>(
    table: string,
    run: (client: SupabaseClient) => PromiseLike<{ data: T; error: unknown }>
  ): Promise<Result<T, StoreReadError>> {
    const result = await Result.tryPromise({
      try: async () => {
        const client = await this.acquireClient()
        const { data, error } = await run(client)
        if (error) throw error
        return data
      },
      catch: () => new StoreReadError({ key: table }),
    })
    return result
  }

  private async mutate(
    table: string,
    run: (client: SupabaseClient) => PromiseLike<{ error: unknown }>
  ): Promise<Result<void, StoreWriteError>> {
    const result = await Result.tryPromise({
      try: async () => {
        const client = await this.acquireClient()
        const { error } = await run(client)
        if (error) throw error
      },
      catch: () => new StoreWriteError({ key: table }),
    })
    if (result.isOk()) this.notify()
    return result
  }

  async listGames(): StoreResult<Game[]> {
    const rows = await this.query("games", (client) =>
      client.from("games").select("*").order("updated_at", { ascending: false })
    )
    return rows.map((list) => (list ?? []).map(gameFromRow))
  }

  async getGame(gameId: string): StoreResult<Game | null> {
    const row = await this.query("games", (client) =>
      client.from("games").select("*").eq("id", gameId).maybeSingle()
    )
    return row.map((data) => (data ? gameFromRow(data) : null))
  }

  async saveGame(game: Game): StoreResult<void> {
    return this.mutate("games", (client) =>
      client.from("games").upsert(gameToRow(game))
    )
  }

  async deleteGame(gameId: string): StoreResult<void> {
    // Child tables cascade in Postgres.
    return this.mutate("games", (client) =>
      client.from("games").delete().eq("id", gameId)
    )
  }

  async listMessages(gameId: string): StoreResult<ChatMessage[]> {
    const rows = await this.query("game_messages", (client) =>
      client
        .from("game_messages")
        .select("*")
        .eq("game_id", gameId)
        .order("created_at", { ascending: true })
    )
    return rows.map((list) => (list ?? []).map(messageFromRow))
  }

  async appendMessages(
    gameId: string,
    messages: ChatMessage[]
  ): StoreResult<void> {
    if (messages.length === 0) return Result.ok(undefined)
    return this.mutate("game_messages", (client) =>
      client.from("game_messages").insert(messages.map(messageToRow))
    )
  }

  async listEvents(gameId: string): StoreResult<GameEvent[]> {
    const rows = await this.query("game_events", (client) =>
      client
        .from("game_events")
        .select("*")
        .eq("game_id", gameId)
        .order("year", { ascending: true })
        .order("month", { ascending: true })
        .order("day", { ascending: true })
    )
    return rows.map((list) => (list ?? []).map(eventFromRow))
  }

  async appendEvents(gameId: string, events: GameEvent[]): StoreResult<void> {
    if (events.length === 0) return Result.ok(undefined)
    return this.mutate("game_events", (client) =>
      client.from("game_events").insert(events.map(eventToRow))
    )
  }

  async listScheduled(gameId: string): StoreResult<ScheduledEvent[]> {
    const rows = await this.query("game_scheduled_events", (client) =>
      client
        .from("game_scheduled_events")
        .select("*")
        .eq("game_id", gameId)
        .order("due_year", { ascending: true })
        .order("due_month", { ascending: true })
        .order("due_day", { ascending: true })
    )
    return rows.map((list) => (list ?? []).map(scheduledFromRow))
  }

  async putScheduled(
    gameId: string,
    scheduled: ScheduledEvent[]
  ): StoreResult<void> {
    // The pending set is replaced wholesale each turn: clear then insert.
    const cleared = await this.mutate("game_scheduled_events", (client) =>
      client.from("game_scheduled_events").delete().eq("game_id", gameId)
    )
    if (cleared.isErr()) return cleared
    if (scheduled.length === 0) return Result.ok(undefined)
    return this.mutate("game_scheduled_events", (client) =>
      client.from("game_scheduled_events").insert(scheduled.map(scheduledToRow))
    )
  }

  subscribe(listener: () => void): () => void {
    // Local-write notifications only for now; Supabase Realtime channels can
    // layer cross-device updates on top later without changing the interface.
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}
