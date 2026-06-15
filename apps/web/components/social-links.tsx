"use client"

import { siDiscord, siGithub } from "simple-icons"
import type { SimpleIcon } from "simple-icons"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

const LINKS = [
  {
    label: "Discord",
    href: "https://discord.gg/7R9hAdMyve",
    icon: siDiscord,
  },
  {
    label: "GitHub",
    href: "https://github.com/openhistoria/openhistoria",
    icon: siGithub,
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
  icon: SimpleIcon
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
        <BrandIcon icon={icon} className="size-4" />
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

function BrandIcon({
  icon,
  className,
}: {
  icon: SimpleIcon
  className?: string
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d={icon.path} />
    </svg>
  )
}
