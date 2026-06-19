"use client"

import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"

import { cn } from "@workspace/ui/lib/utils"

type TooltipContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  trigger: HTMLElement | null
  setTrigger: (element: HTMLElement | null) => void
}

const TooltipContext = createContext<TooltipContextValue | null>(null)

function TooltipProvider({
  children,
}: {
  children: ReactNode
  delay?: number
}) {
  return children
}

function Tooltip({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [trigger, setTrigger] = useState<HTMLElement | null>(null)

  return (
    <TooltipContext.Provider value={{ open, setOpen, trigger, setTrigger }}>
      {children}
    </TooltipContext.Provider>
  )
}

type TriggerElementProps = HTMLAttributes<HTMLElement> & {
  ref?: (element: HTMLElement | null) => void
}

function callHandler<T>(handler: ((event: T) => void) | undefined, event: T) {
  handler?.(event)
}

function TooltipTrigger({
  render,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & {
  render?: ReactElement<TriggerElementProps>
  children?: ReactNode
}) {
  const context = useContext(TooltipContext)
  if (!context) return render ?? children
  if (!render || !isValidElement<TriggerElementProps>(render)) return children

  return cloneElement(render, {
    ...props,
    ...render.props,
    ref: (element: HTMLElement | null) => {
      context.setTrigger(element)
      render.props.ref?.(element)
    },
    onPointerEnter: (event) => {
      callHandler(render.props.onPointerEnter, event)
      callHandler(props.onPointerEnter, event)
      context.setOpen(true)
    },
    onPointerLeave: (event) => {
      callHandler(render.props.onPointerLeave, event)
      callHandler(props.onPointerLeave, event)
      context.setOpen(false)
    },
    onFocus: (event) => {
      callHandler(render.props.onFocus, event)
      callHandler(props.onFocus, event)
      context.setOpen(true)
    },
    onBlur: (event) => {
      callHandler(render.props.onBlur, event)
      callHandler(props.onBlur, event)
      context.setOpen(false)
    },
    children: children ?? render.props.children,
  })
}

function TooltipContent({
  className,
  sideOffset = 6,
  side = "top",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  sideOffset?: number
  side?: "top" | "right" | "bottom" | "left"
}) {
  const context = useContext(TooltipContext)
  const contentRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState({ left: 0, top: 0 })

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  useLayoutEffect(() => {
    if (!context?.open || !context.trigger || !contentRef.current) return

    const updatePosition = () => {
      const triggerRect = context.trigger!.getBoundingClientRect()
      const contentRect = contentRef.current!.getBoundingClientRect()
      const centerX = triggerRect.left + triggerRect.width / 2
      const centerY = triggerRect.top + triggerRect.height / 2

      const next =
        side === "bottom"
          ? {
              left: centerX - contentRect.width / 2,
              top: triggerRect.bottom + sideOffset,
            }
          : side === "left"
            ? {
                left: triggerRect.left - contentRect.width - sideOffset,
                top: centerY - contentRect.height / 2,
              }
            : side === "right"
              ? {
                  left: triggerRect.right + sideOffset,
                  top: centerY - contentRect.height / 2,
                }
              : {
                  left: centerX - contentRect.width / 2,
                  top: triggerRect.top - contentRect.height - sideOffset,
                }

      setPosition({
        left: Math.max(
          8,
          Math.min(next.left, window.innerWidth - contentRect.width - 8)
        ),
        top: Math.max(
          8,
          Math.min(next.top, window.innerHeight - contentRect.height - 8)
        ),
      })
    }

    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)
    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [context?.open, context?.trigger, side, sideOffset])

  if (!mounted || !context?.open) return null

  return createPortal(
    <div
      ref={contentRef}
      role="tooltip"
      data-slot="tooltip-content"
      className={cn(
        "dark pointer-events-none fixed z-[1500] max-w-[16rem] rounded-md bg-black/90 px-2 py-1 text-xs font-medium text-white shadow-md ring-1 ring-white/10 backdrop-blur-sm",
        className
      )}
      style={{
        left: position.left,
        top: position.top,
      }}
      {...props}
    >
      {children}
    </div>,
    document.body
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
