"use client"

import type { ComponentType } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { GlobeIcon } from "@hugeicons/core-free-icons"
import { hasFlag } from "country-flag-icons"
import * as Flags from "country-flag-icons/react/3x2"

type FlagsModule = typeof Flags
type FlagKey = keyof FlagsModule

type FlagComponent = ComponentType<{ title?: string; className?: string }>

interface CountryFlagProps {
  code?: string | null
  title?: string
  className?: string
}

/** 3:2 SVG flag for an ISO alpha-2 code, with a globe fallback. */
export function CountryFlag({ code, title, className }: CountryFlagProps) {
  const upper = code?.toUpperCase()
  if (!upper || !hasFlag(upper)) {
    return <HugeiconsIcon icon={GlobeIcon} className={className} />
  }
  const Flag = Flags[upper as FlagKey] as FlagComponent | undefined
  if (!Flag) {
    return <HugeiconsIcon icon={GlobeIcon} className={className} />
  }
  return <Flag title={title} className={className} />
}
