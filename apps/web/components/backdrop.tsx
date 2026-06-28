import { cn } from "@workspace/ui/lib/utils"

/**
 * A quiet, even page backdrop: a faint grid that fades at the edges. Replaces
 * the old radial "glow" gradients. Sits behind page content; purely decorative.
 */
export function Backdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      <div
        className="absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_75%_70%_at_50%_0%,black,transparent)]"
      />
    </div>
  )
}
