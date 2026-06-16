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

interface DragState {
  dx: number
  dy: number
  maxX: number
  maxY: number
  origin: { x: number; y: number }
  pending: { x: number; y: number }
  raf: number | null
  pointerId: number
  restore: {
    backdropFilter: string
    backgroundColor: string
    boxShadow: string
    contain: string
    cursor: string
    userSelect: string
    webkitBackdropFilter: string
    willChange: string
  }
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
  const dragRef = useRef<DragState | null>(null)

  const bringToFront = () => {
    if (z < topZ) setZ(++topZ)
  }

  const clamp = (pos: { x: number; y: number }, drag: DragState) => {
    return {
      x: Math.max(0, Math.min(drag.maxX, pos.x)),
      y: Math.max(0, Math.min(drag.maxY, pos.y)),
    }
  }

  const onHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return
    bringToFront()
    const handle = e.currentTarget
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    const origin = { x: rect.left, y: rect.top }
    dragRef.current = {
      dx: e.clientX - rect.left,
      dy: e.clientY - rect.top,
      maxX: Math.max(0, window.innerWidth - rect.width),
      maxY: Math.max(0, window.innerHeight - rect.height),
      origin,
      pending: origin,
      raf: null,
      pointerId: e.pointerId,
      restore: {
        backdropFilter: panel.style.backdropFilter,
        backgroundColor: panel.style.backgroundColor,
        boxShadow: panel.style.boxShadow,
        contain: panel.style.contain,
        cursor: document.body.style.cursor,
        userSelect: document.body.style.userSelect,
        webkitBackdropFilter: panel.style.getPropertyValue(
          "-webkit-backdrop-filter"
        ),
        willChange: panel.style.willChange,
      },
    }
    document.body.style.cursor = "grabbing"
    document.body.style.userSelect = "none"
    panel.style.backdropFilter = "none"
    panel.style.backgroundColor = "var(--popover)"
    panel.style.boxShadow = "none"
    panel.style.contain = "layout paint"
    panel.style.setProperty("-webkit-backdrop-filter", "none")
    panel.style.willChange = "transform"
    handle.setPointerCapture(e.pointerId)

    const move = (event: PointerEvent) => {
      const drag = dragRef.current
      const panel = panelRef.current
      if (!drag || !panel || event.pointerId !== drag.pointerId) return
      drag.pending = clamp(
        {
          x: event.clientX - drag.dx,
          y: event.clientY - drag.dy,
        },
        drag
      )
      if (drag.raf !== null) return
      const activeDrag = drag
      drag.raf = window.requestAnimationFrame(() => {
        activeDrag.raf = null
        const x = activeDrag.pending.x - activeDrag.origin.x
        const y = activeDrag.pending.y - activeDrag.origin.y
        panel.style.transform = `translate3d(${x}px, ${y}px, 0)`
      })
    }

    const stop = (event: PointerEvent) => {
      const drag = dragRef.current
      const panel = panelRef.current
      if (!drag || event.pointerId !== drag.pointerId) return
      dragRef.current = null
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", stop)
      window.removeEventListener("pointercancel", stop)
      if (drag.raf != null) window.cancelAnimationFrame(drag.raf)
      document.body.style.cursor = drag.restore.cursor
      document.body.style.userSelect = drag.restore.userSelect
      if (!panel) return
      panel.style.transform = ""
      panel.style.backdropFilter = drag.restore.backdropFilter
      panel.style.backgroundColor = drag.restore.backgroundColor
      panel.style.boxShadow = drag.restore.boxShadow
      panel.style.contain = drag.restore.contain
      panel.style.left = `${drag.pending.x}px`
      panel.style.top = `${drag.pending.y}px`
      panel.style.setProperty(
        "-webkit-backdrop-filter",
        drag.restore.webkitBackdropFilter
      )
      panel.style.willChange = drag.restore.willChange
      onPositionChange(drag.pending)
      try {
        handle.releasePointerCapture(event.pointerId)
      } catch {
        // releasePointerCapture throws if the capture was already lost; ignore.
      }
    }

    window.addEventListener("pointermove", move, { passive: true })
    window.addEventListener("pointerup", stop)
    window.addEventListener("pointercancel", stop)
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
