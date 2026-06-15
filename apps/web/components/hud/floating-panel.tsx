"use client"

import { useRef, useState, type ReactNode } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"

import { cn } from "@workspace/ui/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

import { useI18n } from "@/hooks/use-i18n"

// Shared stacking counter so the most recently focused panel sits on top.
let topZ = 1200

interface FloatingPanelProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  icon?: ReactNode
  position: { x: number; y: number }
  onPositionChange: (pos: { x: number; y: number }) => void
  className?: string
  bodyClassName?: string
  headerExtra?: ReactNode
  children: ReactNode
}

/**
 * Draggable, closable glass panel for the map HUD, ported from the archived
 * Open Historia. The title bar is the drag handle; clicking anywhere brings
 * the panel to the front. Position is owned by the caller so it can persist.
 */
export function FloatingPanel({
  open,
  onClose,
  title,
  icon,
  position,
  onPositionChange,
  className,
  bodyClassName,
  headerExtra,
  children,
}: FloatingPanelProps) {
  const { t } = useI18n()
  const [z, setZ] = useState(() => ++topZ)
  const panelRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)

  const bringToFront = () => {
    if (z < topZ) setZ(++topZ)
  }

  const clamp = (pos: { x: number; y: number }) => {
    const w = panelRef.current?.offsetWidth ?? 0
    const h = panelRef.current?.offsetHeight ?? 0
    const maxX = Math.max(0, window.innerWidth - w)
    const maxY = Math.max(0, window.innerHeight - h)
    return {
      x: Math.max(0, Math.min(maxX, pos.x)),
      y: Math.max(0, Math.min(maxY, pos.y)),
    }
  }

  const onHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return
    bringToFront()
    const rect = panelRef.current?.getBoundingClientRect()
    if (!rect) return
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const { dx, dy } = dragRef.current
    onPositionChange(clamp({ x: e.clientX - dx, y: e.clientY - dy }))
  }

  const onHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // releasePointerCapture throws if the capture was already lost; ignore.
    }
  }

  if (!open) return null
  return (
    <div
      ref={panelRef}
      className={cn(
        "pointer-events-auto fixed flex flex-col overflow-hidden rounded-xl border border-border bg-popover/80 text-popover-foreground shadow-2xl ring-1 ring-border backdrop-blur-xl",
        className
      )}
      style={{ left: position.x, top: position.y, zIndex: z }}
      onPointerDownCapture={bringToFront}
      role="region"
      aria-label={typeof title === "string" ? title : undefined}
    >
      <div
        className="flex cursor-move touch-none items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3 select-none"
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        onPointerCancel={onHeaderPointerUp}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold tracking-wide">
          {icon ? (
            <span className="shrink-0 text-muted-foreground">{icon}</span>
          ) : null}
          <span className="truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1" data-no-drag>
          {headerExtra}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t.common.close}
                  className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                />
              }
            >
              <HugeiconsIcon
                icon={Cancel01Icon}
                strokeWidth={2}
                className="size-4"
              />
            </TooltipTrigger>
            <TooltipContent>{t.common.close}</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className={cn("min-h-0 flex-1 overflow-auto", bodyClassName)}>
        {children}
      </div>
    </div>
  )
}
