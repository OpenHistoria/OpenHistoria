"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlayIcon } from "@hugeicons/core-free-icons"

import { NewGameDialog } from "@/components/new-game/new-game-dialog"
import { useI18n } from "@/hooks/use-i18n"

/**
 * Map-HUD entry point for starting a game: opens the country and start-year
 * picker. Styled to match the other floating map controls.
 */
export function NewGameHudButton() {
  const { t } = useI18n()
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="pointer-events-auto flex cursor-pointer items-center gap-2 rounded-md bg-black/60 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/75"
      >
        <HugeiconsIcon icon={PlayIcon} strokeWidth={2} className="size-3.5" />
        {t.newGame.buttonLabel}
      </button>
      <NewGameDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
