"use client"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { useState } from "react"

import { useGameActions } from "@/components/game-provider"
import { useHudState } from "@/components/hud-state"

export function PauseMenu() {
  const { pauseMenuOpen, closePauseMenu } = useHudState()
  const { resetGame } = useGameActions()
  const [confirmReset, setConfirmReset] = useState(false)

  function handleOpenChange(open: boolean) {
    if (open) return
    setConfirmReset(false)
    closePauseMenu()
  }

  function handleReset() {
    resetGame()
    setConfirmReset(false)
    closePauseMenu()
  }

  return (
    <Dialog open={pauseMenuOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Paused</DialogTitle>
          <DialogDescription>
            {confirmReset
              ? "Resetting wipes your saved progress and starts a new game. This cannot be undone."
              : "Press Escape or Resume to continue governing."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {confirmReset ? (
            <>
              <Button variant="destructive" onClick={handleReset}>
                Confirm reset
              </Button>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => handleOpenChange(false)}>Resume</Button>
              <Button
                variant="outline"
                onClick={() => setConfirmReset(true)}
              >
                Reset game
              </Button>
            </>
          )}
        </div>
        <DialogFooter className="text-xs text-muted-foreground">
          Esc toggles this menu.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
