"use client"

import { useState } from "react"

import { useI18n } from "@/hooks/use-i18n"
import { useOpenRouter } from "@/hooks/use-openrouter"
import { OpenRouterDialog } from "./openrouter-dialog"
import { OpenRouterLogo } from "./openrouter-logo"

/**
 * Map-HUD entry point for the OpenRouter connection: shows the current AI
 * status and opens the connect dialog. Styled to match the other floating
 * map controls.
 */
export function OpenRouterHudButton() {
  const { t } = useI18n()
  const { status } = useOpenRouter()
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="pointer-events-auto flex cursor-pointer items-center gap-2 rounded-md bg-black/60 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/75"
      >
        <OpenRouterLogo className="size-3.5" />
        {status === "connected" ? (
          <>
            {t.home.aiReady}
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-emerald-400"
            />
          </>
        ) : (
          t.home.connectAi
        )}
      </button>
      <OpenRouterDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
