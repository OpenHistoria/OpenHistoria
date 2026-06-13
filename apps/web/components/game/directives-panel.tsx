"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import type { MapMouseEvent } from "maplibre-gl"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  MapPinpoint01Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"

import { Textarea } from "@workspace/ui/components/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import { useGameSession } from "@/components/game/game-session"
import { FloatingPanel } from "@/components/hud/floating-panel"
import { useMapContext } from "@/components/map/map-context"
import { useI18n } from "@/hooks/use-i18n"

/**
 * Floating directives panel, the turn-based counterpart to the archive's
 * presidential-decisions menu: a list of free-text orders that steer the next
 * simulated month. Type an order in the textarea (multi-line), add it, and
 * stack as many as you like; they are applied and cleared on the next turn.
 */
export function DirectivesPanel({
  open,
  onClose,
  position,
  onPositionChange,
}: {
  open: boolean
  onClose: () => void
  position: { x: number; y: number }
  onPositionChange: (pos: { x: number; y: number }) => void
}) {
  const { t } = useI18n()
  const { map } = useMapContext()
  const { directives, addDirective, removeDirective } = useGameSession()
  const [draft, setDraft] = useState("")
  const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(null)
  const [picking, setPicking] = useState(false)

  // While picking, the next map click sets this directive's location. Keep
  // forcing the crosshair on mousemove, since the event-marker hover handlers
  // (and leaving/re-entering the canvas) otherwise reset the cursor.
  useEffect(() => {
    if (!picking || !map) return
    const forceCrosshair = () => {
      map.getCanvas().style.cursor = "crosshair"
    }
    forceCrosshair()
    const onClick = (e: MapMouseEvent) => {
      setCoord({ lat: e.lngLat.lat, lng: e.lngLat.lng })
      setPicking(false)
    }
    map.on("mousemove", forceCrosshair)
    map.once("click", onClick)
    return () => {
      map.off("mousemove", forceCrosshair)
      map.off("click", onClick)
      map.getCanvas().style.cursor = ""
    }
  }, [picking, map])

  const submit = () => {
    const suffix = coord
      ? ` (near ${coord.lat.toFixed(3)}, ${coord.lng.toFixed(3)})`
      : ""
    addDirective(draft + suffix)
    setDraft("")
    setCoord(null)
  }

  return (
    <FloatingPanel
      open={open}
      onClose={onClose}
      position={position}
      onPositionChange={onPositionChange}
      title={t.game.directivesTitle}
      icon={
        <Image
          src="/icons/directives.png"
          alt=""
          width={40}
          height={40}
          className="size-5 object-contain"
        />
      }
      className="max-h-[82vh] w-[min(92vw,460px)]"
      bodyClassName="p-4"
    >
      <p className="mb-3 text-xs leading-snug text-muted-foreground">
        {t.game.directivesHint}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="flex flex-col gap-2"
      >
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter adds; Shift+Enter inserts a newline for multi-line orders.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={t.game.directivesPlaceholder}
          rows={4}
          className="min-h-24 resize-y"
        />
        <div className="flex items-stretch gap-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => setPicking((v) => !v)}
                  aria-pressed={picking}
                  className={cn(
                    "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors",
                    picking
                      ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300"
                      : "border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                />
              }
            >
              <HugeiconsIcon
                icon={MapPinpoint01Icon}
                strokeWidth={2}
                className="size-4"
              />
            </TooltipTrigger>
            <TooltipContent>{t.game.directivesPickLocation}</TooltipContent>
          </Tooltip>

          {coord && (
            <span className="flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2.5 text-[11px] text-muted-foreground tabular-nums">
              {coord.lat.toFixed(2)}, {coord.lng.toFixed(2)}
              <button
                type="button"
                onClick={() => setCoord(null)}
                aria-label={t.game.directivesClearLocation}
                className="cursor-pointer rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  strokeWidth={2}
                  className="size-3"
                />
              </button>
            </span>
          )}

          <button
            type="submit"
            disabled={!draft.trim()}
            className="ml-auto flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <HugeiconsIcon
              icon={PlusSignIcon}
              strokeWidth={2.5}
              className="size-4"
            />
            {t.game.directivesAdd}
          </button>
        </div>

        {picking && (
          <p className="text-[11px] text-emerald-600 dark:text-emerald-300/80">
            {t.game.directivesPicking}
          </p>
        )}
      </form>

      {directives.length === 0 ? (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t.game.directivesEmpty}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {directives.map((directive, index) => (
            <li
              key={`${index}-${directive}`}
              className="flex items-start gap-2 rounded-md border border-border bg-muted/50 px-3 py-2"
            >
              <span className="min-w-0 flex-1 text-sm whitespace-pre-wrap break-words text-foreground/90">
                {directive}
              </span>
              <button
                type="button"
                onClick={() => removeDirective(index)}
                aria-label={t.game.directivesRemove}
                title={t.game.directivesRemove}
                className="shrink-0 cursor-pointer rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  strokeWidth={2}
                  className="size-3.5"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </FloatingPanel>
  )
}
