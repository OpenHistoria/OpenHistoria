import { Result } from "better-result"

import {
  StoreReadError,
  StoreWriteError,
  type CaseStore,
  type StoreResult,
} from "@workspace/detective-engine/store"
import type { Case, ChatMessage, Round } from "@workspace/detective-engine/types"

const PREFIX = "opencase:engine"

/** Fired on window whenever this tab writes to the store. */
export const ENGINE_STORE_CHANGED_EVENT = "opencase:engine-store-changed"

const indexKey = () => `${PREFIX}:cases`
const caseKey = (id: string) => `${PREFIX}:case:${id}`
const messagesKey = (id: string) => `${PREFIX}:messages:${id}`
const roundsKey = (id: string) => `${PREFIX}:rounds:${id}`

/**
 * CaseStore backed by window.localStorage. The default store: cases live in
 * the player's browser only, mirroring how the OpenRouter key is kept
 * client-side. Layout: an index of case ids plus one key per case for its
 * record, message log, and rounds.
 */
export class LocalStorageCaseStore implements CaseStore {
  private read<T>(key: string): Result<T | null, StoreReadError> {
    return Result.try({
      try: () => {
        const raw = window.localStorage.getItem(key)
        return raw === null ? null : (JSON.parse(raw) as unknown)
      },
      catch: () => new StoreReadError({ key }),
    }) as Result<T | null, StoreReadError>
  }

  private write(key: string, value: unknown): Result<void, StoreWriteError> {
    return Result.try({
      try: () => {
        window.localStorage.setItem(key, JSON.stringify(value))
        window.dispatchEvent(new Event(ENGINE_STORE_CHANGED_EVENT))
      },
      catch: () => new StoreWriteError({ key }),
    })
  }

  private readList<T>(key: string): Result<T[], StoreReadError> {
    return this.read<T[]>(key).map((list) => list ?? [])
  }

  private appendTo<T>(
    key: string,
    items: T[]
  ): Result<void, StoreReadError | StoreWriteError> {
    return this.readList<T>(key).andThen((existing) =>
      this.write(key, [...existing, ...items])
    )
  }

  async listCases(): StoreResult<Case[]> {
    const ids = this.readList<string>(indexKey())
    if (ids.isErr()) return Result.err(ids.error)
    const cases: Case[] = []
    for (const id of ids.value) {
      const theCase = this.read<Case>(caseKey(id))
      if (theCase.isErr()) return Result.err(theCase.error)
      if (theCase.value) cases.push(theCase.value)
    }
    return Result.ok(cases)
  }

  async getCase(caseId: string): StoreResult<Case | null> {
    return this.read<Case>(caseKey(caseId))
  }

  async saveCase(theCase: Case): StoreResult<void> {
    const ids = this.readList<string>(indexKey())
    if (ids.isErr()) return Result.err(ids.error)
    if (!ids.value.includes(theCase.id)) {
      const indexed = this.write(indexKey(), [...ids.value, theCase.id])
      if (indexed.isErr()) return indexed
    }
    return this.write(caseKey(theCase.id), theCase)
  }

  async deleteCase(caseId: string): StoreResult<void> {
    const ids = this.readList<string>(indexKey())
    if (ids.isErr()) return Result.err(ids.error)
    const reindexed = this.write(
      indexKey(),
      ids.value.filter((id) => id !== caseId)
    )
    if (reindexed.isErr()) return reindexed
    return Result.try({
      try: () => {
        for (const key of [
          caseKey(caseId),
          messagesKey(caseId),
          roundsKey(caseId),
        ]) {
          window.localStorage.removeItem(key)
        }
        window.dispatchEvent(new Event(ENGINE_STORE_CHANGED_EVENT))
      },
      catch: () => new StoreWriteError({ key: caseKey(caseId) }),
    })
  }

  async listMessages(caseId: string): StoreResult<ChatMessage[]> {
    return this.readList<ChatMessage>(messagesKey(caseId))
  }

  async appendMessages(
    caseId: string,
    messages: ChatMessage[]
  ): StoreResult<void> {
    return this.appendTo(messagesKey(caseId), messages)
  }

  async listRounds(caseId: string): StoreResult<Round[]> {
    return this.readList<Round>(roundsKey(caseId))
  }

  async appendRounds(caseId: string, rounds: Round[]): StoreResult<void> {
    return this.appendTo(roundsKey(caseId), rounds)
  }

  subscribe(listener: () => void): () => void {
    window.addEventListener(ENGINE_STORE_CHANGED_EVENT, listener)
    // Picks up writes from other tabs.
    window.addEventListener("storage", listener)
    return () => {
      window.removeEventListener(ENGINE_STORE_CHANGED_EVENT, listener)
      window.removeEventListener("storage", listener)
    }
  }
}
