"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Backpack01Icon,
  Cancel01Icon,
  Logout01Icon,
} from "@hugeicons/core-free-icons"

import { GENRE_LABELS, type Adventure } from "@workspace/adventure-engine"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

import {
  AdventureSessionProvider,
  useAdventureSession,
} from "@/games/odyssey/components/adventure/adventure-session"
import { SceneView } from "@/games/odyssey/components/adventure/scene-view"
import { StateHud } from "@/games/odyssey/components/adventure/state-hud"

export function AdventureScreen({
  adventure,
  onAdventureChange,
  onExit,
  onNewAdventure,
}: {
  adventure: Adventure
  onAdventureChange: (adventure: Adventure) => void
  onExit: () => void
  onNewAdventure: () => void
}) {
  return (
    <AdventureSessionProvider
      key={adventure.id}
      adventure={adventure}
      onAdventureChange={onAdventureChange}
    >
      <AdventureLayout onExit={onExit} onNewAdventure={onNewAdventure} />
    </AdventureSessionProvider>
  )
}

function AdventureLayout({
  onExit,
  onNewAdventure,
}: {
  onExit: () => void
  onNewAdventure: () => void
}) {
  const { adventure } = useAdventureSession()
  const [hudOpen, setHudOpen] = useState(false)

  return (
    <main className="flex h-svh w-svw flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate font-heading text-sm font-semibold tracking-wide text-foreground">
            {adventure.title}
          </h1>
        </div>
        <Badge variant="outline" className="shrink-0">
          {GENRE_LABELS[adventure.genre]}
        </Badge>
        <div className="ms-auto flex items-center gap-1.5">
          <HeaderButton
            icon={Backpack01Icon}
            label="Status"
            className="lg:hidden"
            onClick={() => setHudOpen((v) => !v)}
          />
          <HeaderButton
            icon={Logout01Icon}
            label="Leave adventure"
            onClick={onExit}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="min-w-0 flex-1">
          <SceneView onNewAdventure={onNewAdventure} />
        </section>

        <aside className="hidden w-72 shrink-0 overflow-y-auto border-s border-border bg-card/40 p-5 lg:block">
          <h2 className="mb-4 font-heading text-sm font-semibold text-foreground">
            {adventure.character.name}
          </h2>
          <StateHud />
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
                {adventure.character.name}
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
            <StateHud />
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
