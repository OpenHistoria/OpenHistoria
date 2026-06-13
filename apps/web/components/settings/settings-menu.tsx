"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { Settings01Icon } from "@hugeicons/core-free-icons"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

import { LanguageRow, OpenRouterRow } from "@/components/settings/settings-rows"
import { useI18n } from "@/hooks/use-i18n"

/**
 * Pre-game settings menu: the Esc menu shown on the map when no game is
 * active. Holds the language switch and the OpenRouter connection, which in
 * a running game live in the pause menu instead.
 */
export function SettingsMenu({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { t } = useI18n()

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-sm" closeLabel={t.common.close}>
        <DialogHeader>
          <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} />
          <DialogTitle>{t.menu.settingsTitle}</DialogTitle>
        </DialogHeader>
        <DialogDescription>{t.menu.settingsSubtitle}</DialogDescription>

        <div className="grid gap-2">
          <LanguageRow />
          <OpenRouterRow />
        </div>

        <DialogFooter className="text-xs text-muted-foreground">
          {t.menu.escHint}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
