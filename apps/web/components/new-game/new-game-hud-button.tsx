"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlayIcon } from "@hugeicons/core-free-icons"

import type { Game } from "@workspace/engine"

import { NewGameDialog } from "@/components/new-game/new-game-dialog"
import { useI18n } from "@/hooks/use-i18n"

/**
 * Map-HUD entry point for starting a game: opens the country and start-year
 * picker. Styled to match the other floating map controls.
 */
export function NewGameHudButton({
  onCreated,
}: {
  onCreated?: (game: Game) => void
}) {
  const { t } = useI18n()
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        title={t.newGame.buttonLabel}
        className="pointer-events-auto flex h-8 cursor-pointer items-center gap-2 rounded-md border border-border bg-background/80 px-3 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-accent"
      >
        <HugeiconsIcon icon={PlayIcon} strokeWidth={2} className="size-3.5" />
        {t.newGame.buttonLabel}
      </button>
      <NewGameDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={onCreated}
      />
    </>
  )
}
