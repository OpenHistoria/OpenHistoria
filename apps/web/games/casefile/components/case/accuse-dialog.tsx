"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { SearchVisualIcon } from "@hugeicons/core-free-icons"

import type { Suspect } from "@workspace/detective-engine"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from "@workspace/ui/components/dialog"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

export function AccuseDialog({
  open,
  onOpenChange,
  suspects,
  busy,
  onAccuse,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  suspects: Suspect[]
  busy: boolean
  onAccuse: (input: { accused: string; reasoning: string }) => void
}) {
  const [accused, setAccused] = useState<string | null>(null)
  const [reasoning, setReasoning] = useState("")

  const reset = () => {
    setAccused(null)
    setReasoning("")
  }

  const submit = () => {
    if (!accused) return
    onAccuse({ accused, reasoning: reasoning.trim() })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg" closeLabel="Close">
        <DialogHeader>Name the killer</DialogHeader>

        <div className="grid gap-4">
          <DialogDescription>
            Make the accusation and the confrontation plays out. There&apos;s no
            taking it back - get it right.
          </DialogDescription>

          <div className="grid gap-2">
            {suspects.map((suspect) => (
              <button
                key={suspect.name}
                type="button"
                onClick={() => setAccused(suspect.name)}
                className={cn(
                  "flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 text-start transition-colors",
                  accused === suspect.name
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background hover:bg-muted"
                )}
              >
                <span className="text-sm font-medium">{suspect.name}</span>
                <span className="text-xs text-muted-foreground">
                  {suspect.role}
                </span>
              </button>
            ))}
          </div>

          <div className="grid gap-1.5">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Your case <span className="font-normal normal-case">(optional)</span>
            </span>
            <Textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Lay out the motive, the method, and the evidence that proves it."
              maxLength={600}
              className="min-h-20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={!accused || busy}>
            {busy ? (
              <Spinner />
            ) : (
              <HugeiconsIcon icon={SearchVisualIcon} strokeWidth={2} />
            )}
            {busy ? "Making the case..." : "Accuse"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
