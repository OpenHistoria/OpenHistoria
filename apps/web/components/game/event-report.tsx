"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  News01Icon,
} from "@hugeicons/core-free-icons"

import type { EventKind } from "@workspace/engine"

import { Button } from "@workspace/ui/components/button"

import { useGameSession, type JumpReport } from "@/components/game/game-session"
import { EventArtwork } from "@/components/game/event-artwork"
import { SpeechButton } from "@/components/game/speech-button"
import { useI18n } from "@/hooks/use-i18n"
import { eventSpeechText } from "@/lib/event-speech"
import { formatGameDate } from "@/lib/format"

/** Left border accent per event kind, matching the briefing feed. */
const KIND_ACCENT: Record<EventKind, string> = {
  political: "border-l-sky-400",
  military: "border-l-red-400",
  economic: "border-l-amber-400",
  diplomatic: "border-l-violet-400",
  social: "border-l-emerald-400",
  scientific: "border-l-cyan-400",
  disaster: "border-l-orange-500",
}

/**
 * Plays back a jump's outcome Pax-Historia style: the briefing first, then each
 * event as its own card the player steps through with Next. Closing the report
 * surfaces any decision the jump raised. Sits above everything else on the HUD.
 */
export function EventReport() {
  const { report, dismissReport } = useGameSession()
  if (!report) return null
  // Keyed per report so playback (step) resets when a fresh jump lands.
  const key = `${report.from.year}-${report.from.month}-${report.from.day}->${report.to.year}-${report.to.month}-${report.to.day}`
  return <ReportView key={key} report={report} onDone={dismissReport} />
}

function ReportView({
  report,
  onDone,
}: {
  report: JumpReport
  onDone: () => void
}) {
  const { t, locale } = useI18n()
  const [step, setStep] = useState(0)

  // Step 0 is the narration briefing; steps 1..n are the events in order.
  const total = 1 + report.events.length
  const onLast = step >= total - 1
  const event = step > 0 ? report.events[step - 1] : null
  const speechText = event
    ? eventSpeechText(event, locale, t)
    : report.narration

  const advance = () => {
    if (onLast) onDone()
    else setStep((s) => s + 1)
  }
  const goBack = () => setStep((s) => Math.max(0, s - 1))

  return (
    <div className="pointer-events-none fixed inset-0 z-[1400] flex items-center justify-center p-4">
      <div
        className="pointer-events-auto absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-hidden
      />
      <div className="pointer-events-auto relative flex max-h-[80vh] w-[min(94vw,480px)] flex-col overflow-hidden rounded-xl border border-border bg-popover/90 text-popover-foreground shadow-2xl ring-1 ring-border backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <HugeiconsIcon
              icon={News01Icon}
              strokeWidth={2}
              className="size-4 shrink-0 text-muted-foreground"
            />
            <span className="truncate text-sm font-semibold tracking-wide">
              {t.game.reportTitle}
            </span>
            <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
              {formatGameDate(report.to, locale)}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <SpeechButton text={speechText} />
            <button
              type="button"
              onClick={onDone}
              aria-label={t.common.close}
              className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <HugeiconsIcon
                icon={Cancel01Icon}
                strokeWidth={2}
                className="size-4"
              />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {event ? (
            <article
              className={`rounded-md rounded-l-none border border-l-2 border-border bg-muted/40 p-3.5 ${KIND_ACCENT[event.kind]}`}
            >
              <EventArtwork
                event={event}
                className="mb-3 h-32 w-full rounded-md object-cover"
              />
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-base leading-tight font-semibold">
                  {event.title}
                </h3>
                <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                  {event.endDate
                    ? `${formatGameDate(event.date, locale)} → ${formatGameDate(event.endDate, locale)}`
                    : formatGameDate(event.date, locale)}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                {event.description}
              </p>
              <span className="mt-2 inline-block text-[10px] tracking-wide text-muted-foreground uppercase">
                {t.game.kinds[event.kind]}
              </span>
            </article>
          ) : (
            <article>
              <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {t.game.narrationHeading}
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                {report.narration}
              </p>
              {report.events.length === 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {t.game.reportEmpty}
                </p>
              )}
            </article>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={step === 0}
              className="gap-2"
            >
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                strokeWidth={2.5}
                className="size-4"
              />
              {t.game.reportPrevious}
            </Button>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {t.game.reportProgress(step + 1, total)}
            </span>
          </div>
          <Button onClick={advance} className="gap-2">
            {onLast ? t.game.reportDone : t.game.reportNext}
            {!onLast && (
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                strokeWidth={2.5}
                className="size-4"
              />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
