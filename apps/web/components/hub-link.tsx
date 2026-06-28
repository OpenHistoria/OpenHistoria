import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { Home09Icon } from "@hugeicons/core-free-icons"

/** Returns to the game-selector hub at the site root. */
export function HubLink({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Back to game hub"
      className={`flex size-8 cursor-pointer items-center justify-center rounded-md border border-border bg-background/80 text-foreground backdrop-blur-sm transition-colors hover:bg-accent hover:text-accent-foreground ${className ?? ""}`}
    >
      <HugeiconsIcon icon={Home09Icon} strokeWidth={2} className="size-4" />
    </Link>
  )
}
