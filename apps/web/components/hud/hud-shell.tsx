import type { ReactNode } from "react"

interface HudShellProps {
  topLeft?: ReactNode
  topRight?: ReactNode
  bottomLeft?: ReactNode
  bottomRight?: ReactNode
  bottomCenter?: ReactNode
}

/**
 * Corner-anchored overlay for the map HUD, ported from the archived Open
 * Historia. The shell itself ignores pointer events so the map underneath
 * stays interactive; each occupied slot re-enables them for its controls.
 */
export function HudShell({
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
  bottomCenter,
}: HudShellProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1100]">
      {topLeft && (
        <div className="pointer-events-auto absolute top-4 left-4">
          {topLeft}
        </div>
      )}
      {topRight && (
        <div className="pointer-events-auto absolute top-4 right-4">
          {topRight}
        </div>
      )}
      {bottomLeft && (
        <div className="pointer-events-auto absolute bottom-4 left-4">
          {bottomLeft}
        </div>
      )}
      {bottomRight && (
        <div className="pointer-events-auto absolute right-4 bottom-4">
          {bottomRight}
        </div>
      )}
      {bottomCenter && (
        <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2">
          {bottomCenter}
        </div>
      )}
    </div>
  )
}
