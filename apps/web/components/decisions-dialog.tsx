"use client"

import type { Project, ProjectKind, ProjectLocation } from "@workspace/engine"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Textarea } from "@workspace/ui/components/textarea"
import { Loader2Icon } from "lucide-react"
import { useState } from "react"

import { useGame, useGameActions } from "@/components/game-provider"

interface DecideResponse {
  name: string
  kind: ProjectKind
  description: string
  expectedDurationDays: number
  location: ProjectLocation
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `proj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function DecisionsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const game = useGame()
  const { addProject } = useGameActions()
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!game) return
    const trimmed = prompt.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/decide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          context: {
            nation: game.nation,
            date: game.date.toISOString(),
          },
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(
          typeof body?.error === "string" ? body.error : `HTTP ${res.status}`
        )
      }

      const data = (await res.json()) as DecideResponse
      const project: Project = {
        id: newId(),
        kind: data.kind,
        name: data.name,
        description: data.description,
        expectedDurationDays: data.expectedDurationDays,
        location: data.location,
        startedAt: game.date.toISOString(),
      }
      addProject(project)
      setPrompt("")
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>New presidential decision</DialogTitle>
            <DialogDescription>
              Describe the action you want to take. A marker will be placed on
              the map.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g. launch a nuclear power plant construction project in Calais"
            rows={4}
            disabled={loading}
            autoFocus
          />
          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="secondary" disabled={loading}>
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={loading || !prompt.trim()}>
              {loading && <Loader2Icon className="animate-spin" />}
              Enact
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
