"use client"

import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  PenTool03Icon,
  RefreshIcon,
  SearchVisualIcon,
} from "@hugeicons/core-free-icons"

import type { CaseOutcome } from "@workspace/detective-engine"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { AccuseDialog } from "@/components/case/accuse-dialog"
import { useCaseSession } from "@/components/case/case-session"

const OUTCOME_COPY: Record<CaseOutcome, { title: string; tone: string }> = {
  solved: { title: "Case Solved", tone: "text-emerald-400" },
  failed: { title: "Case Blown", tone: "text-destructive" },
}

export function InvestigationView({ onNewCase }: { onNewCase: () => void }) {
  const {
    theCase,
    rounds,
    currentRound,
    busy,
    error,
    closed,
    advance,
    accuse,
    retry,
    canRetry,
  } = useCaseSession()
  const [customOpen, setCustomOpen] = useState(false)
  const [customAction, setCustomAction] = useState("")
  const [accuseOpen, setAccuseOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll the newest round into view whenever the investigation grows.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [rounds.length, busy])

  const take = (action: string) => {
    setCustomOpen(false)
    setCustomAction("")
    void advance(action)
  }

  const submitCustom = () => {
    const trimmed = customAction.trim()
    if (trimmed) take(trimmed)
  }

  const onAccuse = (input: { accused: string; reasoning: string }) => {
    void accuse(input).then(() => setAccuseOpen(false))
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-8">
          {rounds.map((round) => (
            <article key={round.id} className="flex flex-col gap-3">
              {round.chosenAction && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground italic">
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    className="size-4 shrink-0"
                  />
                  {round.chosenAction}
                </p>
              )}
              <div className="space-y-4 leading-relaxed whitespace-pre-line text-foreground/90">
                {round.narration}
              </div>
              {round.outcome && (
                <EndingBanner outcome={round.outcome} />
              )}
            </article>
          ))}

          {busy && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Spinner />
              {rounds.length === 0
                ? "Opening the case file..."
                : "Following the thread..."}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>The trail goes cold</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              {canRetry && (
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void retry()}
                  >
                    <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} />
                    Try again
                  </Button>
                </div>
              )}
            </Alert>
          )}
        </div>
      </div>

      {/* Action bar: choices, custom action, accuse, or the ending. */}
      {!busy && (
        <div className="border-t border-border bg-background/60 px-5 py-4 backdrop-blur-sm sm:px-8">
          <div className="mx-auto max-w-2xl">
            {closed ? (
              <EndingFooter onNewCase={onNewCase} />
            ) : currentRound && !error ? (
              customOpen ? (
                <div className="flex flex-col gap-2">
                  <Textarea
                    autoFocus
                    value={customAction}
                    onChange={(e) => setCustomAction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault()
                        submitCustom()
                      }
                    }}
                    placeholder="Describe how you work the case..."
                    className="min-h-16"
                    maxLength={280}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCustomOpen(false)
                        setCustomAction("")
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={submitCustom}
                      disabled={!customAction.trim()}
                    >
                      <HugeiconsIcon icon={SearchVisualIcon} strokeWidth={2} />
                      Do it
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {currentRound.choices.map((choice, i) => (
                    <button
                      key={`${choice.label}-${i}`}
                      type="button"
                      onClick={() => take(choice.label)}
                      className={cn(
                        "group flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-3.5 py-2.5 text-start transition-colors hover:border-primary hover:bg-primary/10"
                      )}
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground">
                        {i + 1}
                      </span>
                      <span className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {choice.label}
                        </span>
                        {choice.hint && (
                          <span className="text-xs text-muted-foreground">
                            {choice.hint}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomOpen(true)}
                      className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                    >
                      <HugeiconsIcon
                        icon={PenTool03Icon}
                        strokeWidth={2}
                        className="size-4"
                      />
                      Write your own move
                    </button>
                    <Button
                      variant="outline"
                      onClick={() => setAccuseOpen(true)}
                    >
                      <HugeiconsIcon icon={SearchVisualIcon} strokeWidth={2} />
                      Accuse
                    </Button>
                  </div>
                </div>
              )
            ) : null}
          </div>
        </div>
      )}

      <AccuseDialog
        open={accuseOpen}
        onOpenChange={setAccuseOpen}
        suspects={theCase.suspects}
        busy={busy}
        onAccuse={onAccuse}
      />
    </div>
  )
}

function EndingBanner({ outcome }: { outcome: CaseOutcome }) {
  const copy = OUTCOME_COPY[outcome]
  return (
    <span
      className={cn(
        "mt-1 font-heading text-base font-semibold tracking-wide",
        copy.tone
      )}
    >
      {copy.title}
    </span>
  )
}

function EndingFooter({ onNewCase }: { onNewCase: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <p className="text-sm text-muted-foreground">
        The case is closed. Another mystery is always waiting.
      </p>
      <Button onClick={onNewCase}>
        <HugeiconsIcon icon={SearchVisualIcon} strokeWidth={2} />
        Open a new case
      </Button>
    </div>
  )
}
