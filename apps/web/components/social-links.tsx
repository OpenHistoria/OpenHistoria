"use client"

import { DiscordIcon, GithubIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

const LINKS = [
  {
    label: "Discord",
    href: "https://discord.gg/7R9hAdMyve",
    icon: DiscordIcon,
  },
  {
    label: "GitHub",
    href: "https://github.com/openhistoria/openhistoria",
    icon: GithubIcon,
  },
] as const

export function SocialLinks() {
  return (
    <div className="flex items-center gap-1">
      {LINKS.map((link) => (
        <SocialLink key={link.href} {...link} />
      ))}
    </div>
  )
}

function SocialLink({
  label,
  href,
  icon,
}: {
  label: string
  href: string
  icon: IconSvgElement
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={label}
            className="flex size-8 cursor-pointer items-center justify-center rounded-md border border-border bg-background/80 text-foreground backdrop-blur-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          />
        }
      >
        <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4" />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
