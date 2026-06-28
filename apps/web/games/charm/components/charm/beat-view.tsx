"use client"

import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  PenTool03Icon,
  RefreshIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"

import type { EndingKind } from "@workspace/seduction-engine"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { useFlirtationSession } from "@/games/charm/components/charm/flirtation-session"

const ENDING_COPY: Record<
  EndingKind,
  { title: string; tone: string; blurb: string }
> = {
  smitten: {
    title: "Smitten",
    tone: "text-rose-400",
    blurb: "You won them over. The night is yours.",
  },
  rejected: {
    title: "They walked away",
    tone: "text-destructive",
    blurb: "Not your night. Some sparks just never catch.",
  },
  friends: {
    title: "Just friends",
    tone: "text-sky-400",
    blurb: "Warm, easy, and entirely platonic. No spark, but no harm.",
  },
  open: {
    title: "Left open",
    tone: "text-foreground",
    blurb: "The night ends with the question still hanging in the air.",
  },
}

export function BeatView({ onNewFlirtation }: { onNewFlirtation: () => void }) {
  const { currentBeat, busy, error, ended, advance, retry, canRetry, beats } =
    useFlirtationSession()
  const [customOpen, setCustomOpen] = useState(false)
  const [customMove, setCustomMove] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll the newest beat into view whenever the encounter grows.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [beats.length, busy])

  const make = (move: string) => {
    setCustomOpen(false)
    setCustomMove("")
    void advance(move)
  }

  const submitCustom = () => {
    const trimmed = customMove.trim()
    if (trimmed) make(trimmed)
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-8">
          {beats.map((beat) => (
            <article key={beat.id} className="flex flex-col gap-3">
              {beat.chosenMove && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground italic">
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    className="size-4 shrink-0"
                  />
                  {beat.chosenMove}
                </p>
              )}
              <div className="space-y-4 leading-relaxed whitespace-pre-line text-foreground/90">
                {beat.narration}
              </div>
            </article>
          ))}

          {busy && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Spinner />
              Reading the room...
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>The moment falters</AlertTitle>
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

      {/* Move bar: choices, a custom line, or the ending. */}
      {!busy && (
        <div className="border-t border-border bg-background/60 px-5 py-4 backdrop-blur-sm sm:px-8">
          <div className="mx-auto max-w-2xl">
            {ended ? (
              <EndingFooter
                kind={currentBeat?.endingKind ?? "open"}
                onNewFlirtation={onNewFlirtation}
              />
            ) : currentBeat && !error ? (
              customOpen ? (
                <div className="flex flex-col gap-2">
                  <Textarea
                    autoFocus
                    value={customMove}
                    onChange={(e) => setCustomMove(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault()
                        submitCustom()
                      }
                    }}
                    placeholder="Say something, or describe what you do..."
                    className="min-h-16"
                    maxLength={280}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCustomOpen(false)
                        setCustomMove("")
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={submitCustom}
                      disabled={!customMove.trim()}
                    >
                      <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />
                      Make your move
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {currentBeat.moves.map((move, i) => (
                    <button
                      key={`${move.label}-${i}`}
                      type="button"
                      onClick={() => make(move.label)}
                      className={cn(
                        "group flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-3.5 py-2.5 text-start transition-colors hover:border-primary hover:bg-primary/10"
                      )}
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground">
                        {i + 1}
                      </span>
                      <span className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {move.label}
                        </span>
                        {move.hint && (
                          <span className="text-xs text-muted-foreground">
                            {move.hint}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCustomOpen(true)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
                    <HugeiconsIcon
                      icon={PenTool03Icon}
                      strokeWidth={2}
                      className="size-4"
                    />
                    Say your own line
                  </button>
                </div>
              )
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

function EndingFooter({
  kind,
  onNewFlirtation,
}: {
  kind: EndingKind
  onNewFlirtation: () => void
}) {
  const copy = ENDING_COPY[kind]
  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <span
        className={cn(
          "font-heading text-lg font-semibold tracking-wide",
          copy.tone
        )}
      >
        {copy.title}
      </span>
      <p className="text-sm text-muted-foreground">{copy.blurb}</p>
      <Button onClick={onNewFlirtation}>
        <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />
        Start a new encounter
      </Button>
    </div>
  )
}
