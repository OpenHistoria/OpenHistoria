"use client"

import { useRef, useState } from "react"
import { Result } from "better-result"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowReloadHorizontalIcon,
  Download01Icon,
  Logout01Icon,
  Menu01Icon,
  News01Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"

import { ROTATE_FREE_MODELS, type Game } from "@workspace/engine"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

import { useGameSession } from "@/components/game/game-session"
import { ModelPicker } from "@/components/model-picker"
import { LanguageRow, OpenRouterRow } from "@/components/settings/settings-rows"
import { useI18n } from "@/hooks/use-i18n"
import { engine } from "@/lib/engine"

/**
 * Esc-triggered game menu: resume, open the briefing, switch language, export
 * or import a save, or exit back to the map. Mirrors the archived pause menu.
 */
export function PauseMenu({
  open,
  onClose,
  onExit,
  onToggleBriefing,
  onImported,
}: {
  open: boolean
  onClose: () => void
  onExit: () => void
  onToggleBriefing: () => void
  onImported: (game: Game) => void
}) {
  const { t } = useI18n()
  const { game, changeModel } = useGameSession()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [confirmExit, setConfirmExit] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [modelOpen, setModelOpen] = useState(false)

  const handleOpenChange = (next: boolean) => {
    if (next) return
    setConfirmExit(false)
    setImportError(null)
    onClose()
  }

  const handleExport = async () => {
    const snapshot = await engine.exportGame(game.id)
    if (snapshot.isErr()) return
    const json = JSON.stringify(snapshot.value, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `openhistoria-${game.countryCode}-${game.currentDate.year}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file later
    if (!file) return
    setImportError(null)
    const text = await file.text()
    const parsed = Result.try(() => JSON.parse(text) as unknown).unwrapOr(null)
    const imported = await engine.importGame(parsed)
    imported.match({
      ok: (g) => {
        onImported(g)
        onClose()
      },
      err: () => setImportError(t.menu.importFailed),
    })
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm" closeLabel={t.common.close}>
        <DialogHeader>
          <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} />
          <DialogTitle>
            {confirmExit ? t.menu.exitConfirmTitle : t.menu.title}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {confirmExit ? t.menu.exitConfirmBody : t.menu.subtitle}
        </DialogDescription>

        {confirmExit ? (
          <div className="grid gap-2">
            <Button variant="destructive" onClick={onExit}>
              {t.menu.exitConfirm}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmExit(false)}>
              {t.menu.cancel}
            </Button>
          </div>
        ) : (
          <div className="grid gap-2">
            <Button onClick={() => handleOpenChange(false)}>
              {t.menu.resume}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onToggleBriefing()
                onClose()
              }}
            >
              <HugeiconsIcon icon={News01Icon} strokeWidth={2} />
              {t.menu.briefing}
            </Button>

            <div className="mt-1 grid gap-2">
              <LanguageRow />
              <OpenRouterRow />
            </div>

            <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-1.5">
              <div className="min-w-0">
                <div className="text-sm text-muted-foreground">
                  {t.menu.model}
                </div>
                <div className="truncate text-xs font-medium" title={game.model}>
                  {game.model === ROTATE_FREE_MODELS
                    ? t.newGame.modelRotateFree
                    : game.model}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setModelOpen(true)}
              >
                {t.menu.changeModel}
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleExport}
            >
              <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
              {t.menu.exportSave}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => fileInputRef.current?.click()}
            >
              <HugeiconsIcon icon={Upload01Icon} strokeWidth={2} />
              {t.menu.importSave}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
              aria-label={t.menu.importSave}
            />
            {importError && (
              <p className="text-xs text-destructive">{importError}</p>
            )}

            <Button variant="outline" onClick={() => setConfirmExit(true)}>
              <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
              {t.menu.exitGame}
            </Button>
          </div>
        )}

        <DialogFooter className="text-xs text-muted-foreground">
          {t.menu.escHint}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {modelOpen && (
      <ModelChangeDialog
        current={game.model}
        onApply={async (id) => {
          await changeModel(id)
          setModelOpen(false)
        }}
        onClose={() => setModelOpen(false)}
      />
    )}
    </>
  )
}

function ModelChangeDialog({
  current,
  onApply,
  onClose,
}: {
  current: string
  onApply: (modelId: string) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const [picked, setPicked] = useState(current)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg" closeLabel={t.common.close}>
        <DialogHeader>
          <HugeiconsIcon icon={ArrowReloadHorizontalIcon} strokeWidth={2} />
          <DialogTitle>{t.menu.modelDialogTitle}</DialogTitle>
        </DialogHeader>
        <ModelPicker selected={picked} onSelect={setPicked} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t.menu.cancel}
          </Button>
          <Button onClick={() => onApply(picked)} disabled={picked === current}>
            {t.menu.apply}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
