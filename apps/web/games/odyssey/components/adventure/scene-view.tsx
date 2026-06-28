"use client"

import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  PenTool03Icon,
  RefreshIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"

import type { EndingKind } from "@workspace/adventure-engine"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { useAdventureSession } from "@/games/odyssey/components/adventure/adventure-session"

const ENDING_COPY: Record<EndingKind, { title: string; tone: string }> = {
  triumph: { title: "Triumph", tone: "text-emerald-400" },
  tragedy: { title: "Tragedy", tone: "text-destructive" },
  twist: { title: "A Twist of Fate", tone: "text-amber-400" },
  open: { title: "The End", tone: "text-foreground" },
}

export function SceneView({ onNewAdventure }: { onNewAdventure: () => void }) {
  const { currentScene, busy, error, ended, advance, retry, canRetry, scenes } =
    useAdventureSession()
  const [customOpen, setCustomOpen] = useState(false)
  const [customAction, setCustomAction] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll the newest scene into view whenever the story grows.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [scenes.length, busy])

  const take = (action: string) => {
    setCustomOpen(false)
    setCustomAction("")
    void advance(action)
  }

  const submitCustom = () => {
    const trimmed = customAction.trim()
    if (trimmed) take(trimmed)
  }

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-6 sm:px-8"
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-8">
          {scenes.map((scene) => (
            <article key={scene.id} className="flex flex-col gap-3">
              {scene.chosenAction && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground italic">
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    className="size-4 shrink-0"
                  />
                  {scene.chosenAction}
                </p>
              )}
              <div className="space-y-4 leading-relaxed whitespace-pre-line text-foreground/90">
                {scene.narration}
              </div>
            </article>
          ))}

          {busy && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Spinner />
              The story unfolds...
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>The tale stalls</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              {canRetry && (
                <div className="mt-2">
                  <Button size="sm" variant="outline" onClick={() => void retry()}>
                    <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} />
                    Try again
                  </Button>
                </div>
              )}
            </Alert>
          )}
        </div>
      </div>

      {/* Action bar: choices, custom action, or the ending. */}
      {!busy && (
        <div className="border-t border-border bg-background/60 px-5 py-4 backdrop-blur-sm sm:px-8">
          <div className="mx-auto max-w-2xl">
            {ended ? (
              <EndingFooter
                kind={currentScene?.endingKind ?? "open"}
                onNewAdventure={onNewAdventure}
              />
            ) : currentScene && !error ? (
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
                    placeholder="Describe what you do..."
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
                      <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />
                      Do it
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {currentScene.choices.map((choice, i) => (
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
                    Write your own action
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
  onNewAdventure,
}: {
  kind: EndingKind
  onNewAdventure: () => void
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
      <p className="text-sm text-muted-foreground">
        Your story has reached its end.
      </p>
      <Button onClick={onNewAdventure}>
        <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />
        Begin a new adventure
      </Button>
    </div>
  )
}
