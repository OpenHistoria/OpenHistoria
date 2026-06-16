"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"

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

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/40 duration-100 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  closeLabel = "Close",
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  closeLabel?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const dragRef = React.useRef<DragState | null>(null)
  // null = use the default centered position; set once the user drags.
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null)

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    const el = e.target as HTMLElement
    // Drag only from the header, never from controls inside it.
    if (!el.closest("[data-dialog-drag]")) return
    if (el.closest("button, input, textarea, select, a, [data-no-drag]")) return
    const handle = e.currentTarget
    const popup = ref.current
    if (!popup) return
    const rect = popup.getBoundingClientRect()
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
        backdropFilter: popup.style.backdropFilter,
        backgroundColor: popup.style.backgroundColor,
        boxShadow: popup.style.boxShadow,
        contain: popup.style.contain,
        cursor: document.body.style.cursor,
        userSelect: document.body.style.userSelect,
        webkitBackdropFilter: popup.style.getPropertyValue(
          "-webkit-backdrop-filter"
        ),
        willChange: popup.style.willChange,
      },
    }
    setPos((p) => p ?? { x: rect.left, y: rect.top })
    document.body.style.cursor = "grabbing"
    document.body.style.userSelect = "none"
    popup.style.backdropFilter = "none"
    popup.style.backgroundColor = "var(--popover)"
    popup.style.boxShadow = "none"
    popup.style.contain = "layout paint"
    popup.style.setProperty("-webkit-backdrop-filter", "none")
    popup.style.willChange = "transform"
    handle.setPointerCapture(e.pointerId)

    const move = (event: PointerEvent) => {
      const drag = dragRef.current
      const el = ref.current
      if (!drag || !el || event.pointerId !== drag.pointerId) return
      drag.pending = {
        x: Math.max(0, Math.min(drag.maxX, event.clientX - drag.dx)),
        y: Math.max(0, Math.min(drag.maxY, event.clientY - drag.dy)),
      }
      if (drag.raf !== null) return
      const activeDrag = drag
      drag.raf = window.requestAnimationFrame(() => {
        activeDrag.raf = null
        const x = activeDrag.pending.x - activeDrag.origin.x
        const y = activeDrag.pending.y - activeDrag.origin.y
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`
      })
    }

    const stop = (event: PointerEvent) => {
      const drag = dragRef.current
      const el = ref.current
      if (!drag || event.pointerId !== drag.pointerId) return
      dragRef.current = null
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", stop)
      window.removeEventListener("pointercancel", stop)
      if (drag.raf != null) window.cancelAnimationFrame(drag.raf)
      document.body.style.cursor = drag.restore.cursor
      document.body.style.userSelect = drag.restore.userSelect
      if (!el) return
      el.style.transform = ""
      el.style.backdropFilter = drag.restore.backdropFilter
      el.style.backgroundColor = drag.restore.backgroundColor
      el.style.boxShadow = drag.restore.boxShadow
      el.style.contain = drag.restore.contain
      el.style.left = `${drag.pending.x}px`
      el.style.top = `${drag.pending.y}px`
      el.style.setProperty(
        "-webkit-backdrop-filter",
        drag.restore.webkitBackdropFilter
      )
      el.style.willChange = drag.restore.willChange
      setPos(drag.pending)
      try {
        handle.releasePointerCapture(event.pointerId)
      } catch {
        // Capture already lost; ignore.
      }
    }

    window.addEventListener("pointermove", move, { passive: true })
    window.addEventListener("pointerup", stop)
    window.addEventListener("pointercancel", stop)
  }

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        ref={ref}
        data-slot="dialog-content"
        onPointerDown={onPointerDown}
        // Translucent themed glass: follows light/dark via tokens.
        className={cn(
          "fixed start-1/2 top-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-3 overflow-hidden rounded-xl border border-border bg-popover/80 p-4 text-sm text-popover-foreground shadow-2xl ring-1 ring-border backdrop-blur-xl duration-100 outline-none sm:max-w-sm rtl:translate-x-1/2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          // Once dragged, anchor by inline left/top and drop the centering.
          pos && "translate-x-0 translate-y-0 rtl:translate-x-0",
          className
        )}
        style={pos ? { left: pos.x, top: pos.y } : undefined}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute end-2.5 top-1.5"
                size="icon-sm"
                title={closeLabel}
              />
            }
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            <span className="sr-only">{closeLabel}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      // FloatingPanel-style title bar; also the drag handle (DialogContent
      // moves the dialog when this is pressed). Put an icon + DialogTitle here;
      // render DialogDescription in the body below.
      data-dialog-drag=""
      className={cn(
        "-mx-4 -mt-4 flex cursor-move items-center gap-2 border-b border-border bg-muted/40 px-4 py-3 pe-12 text-sm font-semibold tracking-wide select-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t border-border bg-muted/40 p-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
