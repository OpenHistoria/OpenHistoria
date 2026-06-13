"use client"

import { useState } from "react"

import { Button } from "@workspace/ui/components/button"

import { OpenRouterDialog } from "@/components/openrouter/openrouter-dialog"
import { useI18n } from "@/hooks/use-i18n"
import { useOpenRouter } from "@/hooks/use-openrouter"
import { LOCALES } from "@/lib/i18n"

/** Language switch row, shared by the pre-game settings and in-game pause menus. */
export function LanguageRow() {
  const { t, locale, setLocale } = useI18n()

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-1.5">
      <span className="text-sm text-muted-foreground">{t.menu.language}</span>
      <div className="flex overflow-hidden rounded-md border border-border">
        {LOCALES.map((option) => (
          <button
            key={option}
            type="button"
            lang={option}
            aria-pressed={locale === option}
            onClick={() => setLocale(option)}
            className={`cursor-pointer px-2.5 py-1 text-xs font-medium uppercase transition-colors ${
              locale === option
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * OpenRouter connect/status row, shared by the pre-game settings and in-game
 * pause menus. Opens the full connect dialog on demand.
 */
export function OpenRouterRow() {
  const { t } = useI18n()
  const { status } = useOpenRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const connected = status === "connected"

  return (
    <>
      <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-1.5">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">{t.menu.aiAccount}</div>
          <div className="flex items-center gap-1.5 text-xs font-medium">
            {connected ? t.home.aiReady : t.home.connectAi}
            {connected && (
              <span
                aria-hidden
                className="size-1.5 rounded-full bg-emerald-400"
              />
            )}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
          {connected ? t.menu.manage : t.menu.connect}
        </Button>
      </div>
      <OpenRouterDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
