"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  FavouriteIcon,
  Location01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"

import { cn } from "@workspace/ui/lib/utils"

import { useFlirtationSession } from "@/games/charm/components/charm/flirtation-session"

export function MoodHud() {
  const { state } = useFlirtationSession()

  const attractionTone =
    state.attraction > 66
      ? "bg-rose-500"
      : state.attraction > 33
        ? "bg-amber-500"
        : "bg-muted-foreground"

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="grid gap-1.5">
        <Label icon={FavouriteIcon} label="Attraction" />
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", attractionTone)}
            style={{
              width: `${Math.max(0, Math.min(100, state.attraction))}%`,
            }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {state.attraction}/100
        </span>
      </div>

      <Field icon={undefined} label="Mood">
        <span className="text-foreground">
          {state.mood || "Hard to read"}
        </span>
      </Field>

      <Field icon={Location01Icon} label="Where">
        <span className="text-foreground">{state.location || "Unknown"}</span>
      </Field>

      <div className="grid gap-1.5">
        <Label icon={SparklesIcon} label="Chemistry" />
        {state.chemistry.length ? (
          <ul className="flex flex-col gap-1">
            {state.chemistry.map((spark) => (
              <li
                key={spark}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
              >
                {spark}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-xs text-muted-foreground">
            No sparks yet
          </span>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label icon={Alert02Icon} label="Missteps" />
        {state.missteps.length ? (
          <ul className="flex flex-col gap-1">
            {state.missteps.map((miss) => (
              <li
                key={miss}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
              >
                {miss}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-xs text-muted-foreground">
            Nothing fumbled
          </span>
        )}
      </div>

      {state.read && (
        <Field icon={undefined} label="Read">
          <span className="text-pretty text-muted-foreground italic">
            {state.read}
          </span>
        </Field>
      )}
    </div>
  )
}

function Label({
  icon,
  label,
}: {
  icon?: IconSvgElement
  label: string
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {icon && (
        <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5" />
      )}
      {label}
    </span>
  )
}

function Field({
  icon,
  label,
  children,
}: {
  icon?: IconSvgElement
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1">
      <Label icon={icon} label={label} />
      {children}
    </div>
  )
}
