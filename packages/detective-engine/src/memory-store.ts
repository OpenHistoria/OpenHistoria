import { Result } from "better-result"

import type { CaseStore, StoreResult } from "@workspace/detective-engine/store"
import type { Case, ChatMessage, Round } from "@workspace/detective-engine/types"

/**
 * In-memory CaseStore. Nothing survives a reload; useful for tests, SSR, and
 * prototyping. All operations are infallible.
 */
export class MemoryCaseStore implements CaseStore {
  private cases = new Map<string, Case>()
  private messages = new Map<string, ChatMessage[]>()
  private rounds = new Map<string, Round[]>()
  private listeners = new Set<() => void>()

  private notify() {
    for (const listener of this.listeners) listener()
  }

  async listCases(): StoreResult<Case[]> {
    return Result.ok([...this.cases.values()])
  }

  async getCase(caseId: string): StoreResult<Case | null> {
    return Result.ok(this.cases.get(caseId) ?? null)
  }

  async saveCase(theCase: Case): StoreResult<void> {
    this.cases.set(theCase.id, theCase)
    this.notify()
    return Result.ok(undefined)
  }

  async deleteCase(caseId: string): StoreResult<void> {
    this.cases.delete(caseId)
    this.messages.delete(caseId)
    this.rounds.delete(caseId)
    this.notify()
    return Result.ok(undefined)
  }

  async listMessages(caseId: string): StoreResult<ChatMessage[]> {
    return Result.ok(this.messages.get(caseId) ?? [])
  }

  async appendMessages(
    caseId: string,
    messages: ChatMessage[]
  ): StoreResult<void> {
    this.messages.set(caseId, [
      ...(this.messages.get(caseId) ?? []),
      ...messages,
    ])
    this.notify()
    return Result.ok(undefined)
  }

  async listRounds(caseId: string): StoreResult<Round[]> {
    return Result.ok(this.rounds.get(caseId) ?? [])
  }

  async appendRounds(caseId: string, rounds: Round[]): StoreResult<void> {
    this.rounds.set(caseId, [...(this.rounds.get(caseId) ?? []), ...rounds])
    this.notify()
    return Result.ok(undefined)
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}
