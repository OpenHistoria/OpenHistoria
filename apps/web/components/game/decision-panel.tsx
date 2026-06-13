"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, Crown02Icon } from "@hugeicons/core-free-icons"

import { Button } from "@workspace/ui/components/button"

import { useGameSession } from "@/components/game/game-session"
import { useI18n } from "@/hooks/use-i18n"

/**
 * Crusader-Kings-style decision prompt: when the simulation raises a fork the
 * game pauses and asks the player to choose. Centered and modal-feeling so it
 * demands attention, but the chosen option just becomes the next directive.
 */
export function DecisionPanel() {
  const { t } = useI18n()
  const { pendingDecision, resolveDecision, dismissDecision } = useGameSession()

  if (!pendingDecision) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[1300] flex items-center justify-center p-4">
      {/* Dim the map so the choice reads as the focus. */}
      <div
        className="pointer-events-auto absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={dismissDecision}
        aria-hidden
      />
      <div className="pointer-events-auto relative w-[min(94vw,440px)] overflow-hidden rounded-xl border border-border bg-popover/80 text-popover-foreground shadow-2xl ring-1 ring-border backdrop-blur-xl">
        <div className="flex items-start gap-2.5 border-b border-border bg-muted/40 p-4">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-300">
            <HugeiconsIcon icon={Crown02Icon} strokeWidth={2} className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-medium tracking-widest text-amber-600 uppercase dark:text-amber-300/80">
              {t.game.decisionBadge}
            </div>
            <h2 className="text-base leading-tight font-semibold">
              {pendingDecision.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={dismissDecision}
            aria-label={t.game.decisionDismiss}
            title={t.game.decisionDismiss}
            className="-mt-1 -mr-1 shrink-0 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
            {pendingDecision.prompt}
          </p>

          <div className="mt-4 flex flex-col gap-2">
            {pendingDecision.options.map((option, index) => (
              <Button
                key={`${index}-${option.label}`}
                variant="outline"
                onClick={() => resolveDecision(option)}
                className="h-auto w-full flex-col items-start gap-0.5 px-3.5 py-2.5 text-left whitespace-normal"
              >
                <span className="text-sm font-medium">{option.label}</span>
                {option.detail && (
                  <span className="text-xs leading-snug text-muted-foreground">
                    {option.detail}
                  </span>
                )}
              </Button>
            ))}
          </div>

          <Button
            variant="ghost"
            onClick={dismissDecision}
            className="mt-3 w-full text-xs text-muted-foreground"
          >
            {t.game.decisionDismiss}
          </Button>
        </div>
      </div>
    </div>
  )
}
