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
import { useEffect, useState } from "react"

import { useGame } from "@/components/game-provider"

const STORAGE_KEY = "openhistoria:welcome-shown"

export function WelcomeDialog() {
  const game = useGame()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!game) return
    if (typeof window === "undefined") return
    if (window.localStorage.getItem(STORAGE_KEY) === "1") return
    setOpen(true)
  }, [game])

  function close() {
    setOpen(false)
    try {
      window.localStorage.setItem(STORAGE_KEY, "1")
    } catch {
      // ignore
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Welcome to Open Historia</DialogTitle>
          <DialogDescription>
            You are Emmanuel Macron, 11 months from the 2027 presidential
            election. Build a legacy your party can defend at the ballot box.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 text-sm">
          <Section
            title="Run your country"
            body="Click the portrait to open the country stats panel; click the gold action button (or press D) to open the decisions panel. Each decision is a project on the map: it costs upfront, drains the treasury monthly, and pays back approval and GDP on completion."
          />
          <Section
            title="Respond to events"
            body="Crises and opportunities pop up at scheduled dates and randomly throughout. Each choice has previewable effects on treasury, approval, and the economy."
          />
          <Section
            title="Treasury & approval"
            body="Watch the top-left dashboard. Issue bonds to refill the treasury (at the cost of debt and approval), or take a media tour for a quick approval bump."
          />
          <Section
            title="Win the election"
            body="In April 2027 your second term ends. Voters judge your record. Approval ≥ 42% with unemployment under 9% secures your legacy."
          />
          <Section
            title="Shortcuts"
            body="Space pauses, 1–5 sets speed, D toggles decisions, S toggles country stats, B toggles the briefing log, Esc opens the pause menu (or closes the topmost panel). Panels are draggable by their title bar."
          />
        </div>
        <DialogFooter>
          <Button onClick={close}>Start governing</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="font-medium leading-tight">{title}</div>
      <p className="text-xs text-muted-foreground leading-snug">{body}</p>
    </div>
  )
}
