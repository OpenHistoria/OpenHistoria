"use client"

import type { ComponentType } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { GlobeIcon } from "@hugeicons/core-free-icons"
import { hasFlag } from "country-flag-icons"
import * as Flags from "country-flag-icons/react/3x2"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

type FlagsModule = typeof Flags
type FlagKey = keyof FlagsModule

type FlagComponent = ComponentType<{ title?: string; className?: string }>

interface CountryFlagProps {
  code?: string | null
  title?: string
  className?: string
  /** Show a shadcn tooltip with the title on hover (uses `title` text). */
  tooltip?: boolean
}

/** 3:2 SVG flag for an ISO alpha-2 code, with a globe fallback. */
export function CountryFlag({
  code,
  title,
  className,
  tooltip,
}: CountryFlagProps) {
  const upper = code?.toUpperCase()

  let flag
  if (!upper || !hasFlag(upper)) {
    flag = <HugeiconsIcon icon={GlobeIcon} className={className} />
  } else {
    const Flag = Flags[upper as FlagKey] as FlagComponent | undefined
    flag = Flag ? (
      <Flag title={tooltip ? undefined : title} className={className} />
    ) : (
      <HugeiconsIcon icon={GlobeIcon} className={className} />
    )
  }

  if (!tooltip || !title) return flag

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        {flag}
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  )
}
