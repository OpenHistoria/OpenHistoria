"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"

import { useGame } from "@/components/game-provider"
import { sfx } from "@/lib/sfx"

export function BriefingToasts() {
  const game = useGame()
  const lastIdRef = useRef<string | null>(null)
  const initialisedRef = useRef(false)

  useEffect(() => {
    if (!game) return
    const top = game.briefing[0]
    if (!top) {
      initialisedRef.current = true
      return
    }
    if (!initialisedRef.current) {
      initialisedRef.current = true
      lastIdRef.current = top.id
      return
    }
    if (lastIdRef.current === top.id) return
    lastIdRef.current = top.id

    showToast(top.kind, top.title, top.detail)
    playForKind(top.kind)
  }, [game?.briefing])

  return null
}

function playForKind(kind: string) {
  if (kind === "project_completed") {
    sfx.chime()
  } else if (kind === "event") {
    sfx.swoosh()
  } else if (kind === "warning" || kind === "project_cancelled") {
    sfx.alert()
  }
}

function showToast(kind: string, title: string, detail?: string) {
  const opts = { description: detail, duration: 3500 }
  if (kind === "project_completed" || kind === "milestone") {
    toast.success(title, opts)
  } else if (kind === "project_cancelled" || kind === "warning") {
    toast.warning(title, opts)
  } else if (kind === "event") {
    toast.info(title, opts)
  } else {
    toast.message(title, opts)
  }
}
