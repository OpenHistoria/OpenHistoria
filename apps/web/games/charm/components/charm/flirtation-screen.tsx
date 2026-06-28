"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  FavouriteIcon,
  Logout01Icon,
} from "@hugeicons/core-free-icons"

import { SCENARIO_LABELS, type Flirtation } from "@workspace/seduction-engine"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

import { BeatView } from "@/games/charm/components/charm/beat-view"
import {
  FlirtationSessionProvider,
  useFlirtationSession,
} from "@/games/charm/components/charm/flirtation-session"
import { MoodHud } from "@/games/charm/components/charm/mood-hud"

export function FlirtationScreen({
  flirtation,
  onFlirtationChange,
  onExit,
  onNewFlirtation,
}: {
  flirtation: Flirtation
  onFlirtationChange: (flirtation: Flirtation) => void
  onExit: () => void
  onNewFlirtation: () => void
}) {
  return (
    <FlirtationSessionProvider
      key={flirtation.id}
      flirtation={flirtation}
      onFlirtationChange={onFlirtationChange}
    >
      <FlirtationLayout onExit={onExit} onNewFlirtation={onNewFlirtation} />
    </FlirtationSessionProvider>
  )
}

function FlirtationLayout({
  onExit,
  onNewFlirtation,
}: {
  onExit: () => void
  onNewFlirtation: () => void
}) {
  const { flirtation } = useFlirtationSession()
  const [hudOpen, setHudOpen] = useState(false)

  return (
    <main className="flex h-svh w-svw flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate font-heading text-sm font-semibold tracking-wide text-foreground">
            {flirtation.title}
          </h1>
        </div>
        <Badge variant="outline" className="shrink-0">
          {SCENARIO_LABELS[flirtation.scenario]}
        </Badge>
        <div className="ms-auto flex items-center gap-1.5">
          <HeaderButton
            icon={FavouriteIcon}
            label="How it's going"
            className="lg:hidden"
            onClick={() => setHudOpen((v) => !v)}
          />
          <HeaderButton
            icon={Logout01Icon}
            label="Leave encounter"
            onClick={onExit}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="min-w-0 flex-1">
          <BeatView onNewFlirtation={onNewFlirtation} />
        </section>

        <aside className="hidden w-72 shrink-0 overflow-y-auto border-s border-border bg-card/40 p-5 lg:block">
          <h2 className="mb-4 font-heading text-sm font-semibold text-foreground">
            {flirtation.interest.name}
          </h2>
          <MoodHud />
        </aside>
      </div>

      {/* Mobile status drawer. */}
      {hudOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setHudOpen(false)}
        >
          <div
            className="absolute end-0 top-0 h-full w-72 max-w-[80vw] overflow-y-auto border-s border-border bg-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-sm font-semibold text-foreground">
                {flirtation.interest.name}
              </h2>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setHudOpen(false)}
                aria-label="Close"
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </Button>
            </div>
            <MoodHud />
          </div>
        </div>
      )}
    </main>
  )
}

function HeaderButton({
  icon,
  label,
  className,
  onClick,
}: {
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"]
  label: string
  className?: string
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onClick}
            aria-label={label}
            className={className}
          />
        }
      >
        <HugeiconsIcon icon={icon} strokeWidth={2} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
