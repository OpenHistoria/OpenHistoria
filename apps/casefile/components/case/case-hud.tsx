"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Location01Icon,
  SearchVisualIcon,
  Target02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"

import { Badge } from "@workspace/ui/components/badge"

import { useCaseSession } from "@/components/case/case-session"

export function CaseHud() {
  const { theCase, state } = useCaseSession()
  const cleared = new Set(state.cleared.map((n) => n.toLowerCase()))

  return (
    <div className="flex flex-col gap-5 text-sm">
      <div>
        <h2 className="font-heading text-sm font-semibold text-foreground">
          {theCase.detective.name}
        </h2>
        {theCase.detective.role && (
          <p className="text-xs text-muted-foreground">
            {theCase.detective.role}
          </p>
        )}
      </div>

      <Field icon={Location01Icon} label="Location">
        <span className="text-foreground">{state.location || "Unknown"}</span>
      </Field>

      <div className="grid gap-1.5">
        <Label icon={SearchVisualIcon} label="Clues" />
        {state.clues.length ? (
          <ul className="flex flex-col gap-1">
            {state.clues.map((clue, i) => (
              <li
                key={`${clue}-${i}`}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
              >
                {clue}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-xs text-muted-foreground">
            Nothing gathered yet
          </span>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label icon={Target02Icon} label="Leads" />
        {state.leads.length ? (
          <ul className="flex flex-col gap-1">
            {state.leads.map((lead, i) => (
              <li
                key={`${lead}-${i}`}
                className="flex gap-1.5 text-xs text-muted-foreground"
              >
                <span className="text-primary">-</span>
                <span>{lead}</span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-xs text-muted-foreground">No open threads</span>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label icon={UserGroupIcon} label="Suspects" />
        <ul className="flex flex-col gap-2">
          {theCase.suspects.map((suspect) => {
            const isCleared = cleared.has(suspect.name.toLowerCase())
            return (
              <li
                key={suspect.name}
                className="rounded-md border border-border bg-background px-2.5 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {suspect.name}
                  </span>
                  {isCleared && (
                    <Badge variant="secondary" className="shrink-0 text-[0.6rem]">
                      Cleared
                    </Badge>
                  )}
                </div>
                <p className="text-[0.7rem] leading-tight text-muted-foreground">
                  {suspect.role}
                </p>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function Label({ icon, label }: { icon?: IconSvgElement; label: string }) {
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
