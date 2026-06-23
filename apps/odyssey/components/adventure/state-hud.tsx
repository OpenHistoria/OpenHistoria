"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  FavouriteIcon,
  Location01Icon,
  Target02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"

import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

import { useAdventureSession } from "@/components/adventure/adventure-session"

export function StateHud() {
  const { state } = useAdventureSession()

  const healthTone =
    state.health > 60
      ? "bg-emerald-500"
      : state.health > 30
        ? "bg-amber-500"
        : "bg-destructive"

  return (
    <div className="flex flex-col gap-4 text-sm">
      <Field icon={Location01Icon} label="Location">
        <span className="text-foreground">{state.location || "Unknown"}</span>
      </Field>

      <div className="grid gap-1.5">
        <Label icon={FavouriteIcon} label="Health" />
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", healthTone)}
            style={{ width: `${Math.max(0, Math.min(100, state.health))}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{state.health}/100</span>
      </div>

      <Field icon={Target02Icon} label="Objective">
        <span className="text-foreground">{state.objective || "Undecided"}</span>
      </Field>

      <div className="grid gap-1.5">
        <Label icon={UserGroupIcon} label="Companions" />
        {state.companions.length ? (
          <div className="flex flex-wrap gap-1.5">
            {state.companions.map((c) => (
              <Badge key={c} variant="secondary">
                {c}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Travelling alone</span>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label label="Inventory" />
        {state.inventory.length ? (
          <ul className="flex flex-col gap-1">
            {state.inventory.map((item) => (
              <li
                key={item}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-xs text-muted-foreground">
            Your pockets are empty
          </span>
        )}
      </div>
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
      {icon && <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5" />}
      {label}
    </span>
  )
}

function Field({
  icon,
  label,
  children,
}: {
  icon: IconSvgElement
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
