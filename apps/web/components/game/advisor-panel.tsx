"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  PlusSignIcon,
  RefreshIcon,
  SentIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"

import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import { useGameSession } from "@/components/game/game-session"
import {
  InlineExplainedText,
  type TextAnnotation,
} from "@/components/game/inline-explained-text"
import { FloatingPanel } from "@/components/hud/floating-panel"
import { useI18n } from "@/hooks/use-i18n"
import { engine } from "@/lib/engine"

interface AdvisorMessage {
  role: "user" | "assistant"
  content: string
  /** Ready-to-issue directives the advisor proposed (assistant only). */
  suggestedActions?: string[]
  suggestedActionAnnotations?: AdvisorActionAnnotation[]
}

interface AdvisorActionAnnotation extends TextAnnotation {
  actionIndex: number
}

interface FailedAdvisorRequest {
  message: string
  history: Pick<AdvisorMessage, "role" | "content">[]
}

/**
 * The advisor panel: a chat with the player's strategic advisor. It has the
 * full context of the current game (country, date, recent events, queued
 * directives) and can propose directives the player adds to their queue with
 * one click. Conversation lives for the session (per game), not persisted.
 */
export function AdvisorPanel({
  open,
  onClose,
  position,
  onPositionChange,
}: {
  open: boolean
  onClose: () => void
  position: { x: number; y: number }
  onPositionChange: (pos: { x: number; y: number }) => void
}) {
  const { t } = useI18n()
  const { game, directives, addDirective, modelSelection } = useGameSession()
  const [messages, setMessages] = useState<AdvisorMessage[]>([])
  const [draft, setDraft] = useState("")
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState(false)
  const [failedRequest, setFailedRequest] =
    useState<FailedAdvisorRequest | null>(null)
  // Keys ("msgIndex:actionIndex") of suggested directives already queued.
  const [added, setAdded] = useState<Set<string>>(new Set())
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [messages, thinking])

  const sendMessage = useCallback(
    async ({
      message,
      history,
      appendUser,
    }: {
      message: string
      history: Pick<AdvisorMessage, "role" | "content">[]
      appendUser: boolean
    }) => {
      if (!message || thinking) return
      if (appendUser) {
        setDraft("")
        setMessages((prev) => [...prev, { role: "user", content: message }])
      }
      setError(false)
      setFailedRequest(null)
      setThinking(true)

      const result = await engine.consultAdvisor(game.id, {
        history,
        message,
        directives,
        ...modelSelection(),
      })
      setThinking(false)
      result.match({
        ok: (reply) =>
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: reply.reply,
              suggestedActions: reply.suggestedActions,
              suggestedActionAnnotations: reply.suggestedActionAnnotations,
            },
          ]),
        err: () => {
          setError(true)
          setFailedRequest({ message, history })
        },
      })
    },
    [directives, game.id, modelSelection, thinking]
  )

  const send = async () => {
    const message = draft.trim()
    if (!message || thinking) return
    const history = messages.map((m) => ({ role: m.role, content: m.content }))
    await sendMessage({ message, history, appendUser: true })
  }

  const retry = async () => {
    if (!failedRequest || thinking) return
    await sendMessage({ ...failedRequest, appendUser: false })
  }

  const reset = () => {
    setMessages([])
    setAdded(new Set())
    setError(false)
    setFailedRequest(null)
  }

  return (
    <FloatingPanel
      open={open}
      onClose={onClose}
      position={position}
      onPositionChange={onPositionChange}
      title={t.game.advisor.title}
      icon={
        <Image
          src="/icons/advisor.png"
          alt=""
          width={40}
          height={40}
          className="size-5 rounded-full object-contain"
        />
      }
      className="flex h-[min(74vh,560px)] w-[min(92vw,420px)] flex-col"
      bodyClassName="flex flex-col p-0"
      headerExtra={
        messages.length > 0 ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={reset}
                  aria-label={t.game.advisor.reset}
                  className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                />
              }
            >
              <HugeiconsIcon
                icon={RefreshIcon}
                strokeWidth={2}
                className="size-4"
              />
            </TooltipTrigger>
            <TooltipContent>{t.game.advisor.reset}</TooltipContent>
          </Tooltip>
        ) : null
      }
    >
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {messages.length === 0 && (
          <p className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">
            {t.game.advisor.intro}
          </p>
        )}

        <div className="flex flex-col gap-3">
          {messages.map((message, msgIndex) => (
            <div
              key={msgIndex}
              className={cn(
                "flex flex-col gap-1.5",
                message.role === "user" ? "items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[88%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-line",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/70 text-foreground/90"
                )}
              >
                {message.content}
              </div>

              {message.suggestedActions &&
                message.suggestedActions.length > 0 && (
                  <div className="mt-0.5 flex w-full flex-col gap-1.5">
                    <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
                      {t.game.advisor.suggestedLabel}
                    </span>
                    {message.suggestedActions.map((action, actionIndex) => {
                      const key = `${msgIndex}:${actionIndex}`
                      const isAdded = added.has(key)
                      const annotations =
                        message.suggestedActionAnnotations
                          ?.filter(
                            (annotation) =>
                              annotation.actionIndex === actionIndex
                          )
                          .map(({ term, explanation }) => ({
                            term,
                            explanation,
                          })) ?? []
                      return (
                        <div
                          key={key}
                          className="flex items-start gap-2 rounded-md border border-border bg-background/60 px-2.5 py-1.5"
                        >
                          <span className="min-w-0 flex-1 text-xs text-foreground/90">
                            <InlineExplainedText
                              text={action}
                              annotations={annotations}
                            />
                          </span>
                          <button
                            type="button"
                            disabled={isAdded}
                            onClick={() => {
                              addDirective(action, annotations)
                              setAdded((prev) => new Set(prev).add(key))
                            }}
                            className={cn(
                              "flex shrink-0 cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors",
                              isAdded
                                ? "cursor-default text-emerald-600 dark:text-emerald-400"
                                : "text-primary hover:bg-accent"
                            )}
                          >
                            <HugeiconsIcon
                              icon={isAdded ? Tick02Icon : PlusSignIcon}
                              strokeWidth={2.5}
                              className="size-3"
                            />
                            {isAdded
                              ? t.game.advisor.added
                              : t.game.advisor.addAction}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
            </div>
          ))}

          {thinking && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner />
              {t.game.advisor.thinking}
            </div>
          )}
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/15 px-2 py-1.5 text-destructive">
              <p className="text-[11px]">{t.game.advisor.error}</p>
              {failedRequest && (
                <button
                  type="button"
                  onClick={() => void retry()}
                  disabled={thinking}
                  className="mt-1.5 flex cursor-pointer items-center gap-1 text-[11px] font-semibold underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <HugeiconsIcon
                    icon={RefreshIcon}
                    strokeWidth={2.5}
                    className="size-3"
                  />
                  {t.game.advisor.retry}
                </button>
              )}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
        className="flex items-end gap-2 border-t border-border p-3"
      >
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
          placeholder={t.game.advisor.placeholder}
          rows={1}
          className="max-h-28 min-h-9 flex-1 resize-none"
        />
        <button
          type="submit"
          disabled={!draft.trim() || thinking}
          aria-label={t.game.advisor.send}
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <HugeiconsIcon icon={SentIcon} strokeWidth={2} className="size-4" />
        </button>
      </form>
    </FloatingPanel>
  )
}
