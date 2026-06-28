import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  Coffee02Icon,
  EarthIcon,
  SearchVisualIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"

import { SocialLinks } from "@/components/social-links"

const GAMES = [
  {
    href: "/historia",
    title: "Open Historia",
    tagline: "A grand strategy sandbox. Steer a nation through alternate history.",
    icon: EarthIcon,
  },
  {
    href: "/casefile",
    title: "Open Case",
    tagline: "An AI detective game. A fresh murder, suspects, and a killer to name.",
    icon: SearchVisualIcon,
  },
  {
    href: "/odyssey",
    title: "Open Odyssey",
    tagline: "An AI choose-your-own-adventure. Shape the story one choice at a time.",
    icon: SparklesIcon,
  },
] as const

export default function Page() {
  return (
    <main className="relative min-h-svh w-full overflow-y-auto bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,theme(colors.primary/12),transparent_60%)]" />

      <div className="relative mx-auto flex min-h-svh w-full max-w-4xl flex-col px-5 py-10">
        <header className="flex items-center justify-between">
          <span className="font-heading text-sm font-semibold tracking-[0.25em] text-foreground uppercase">
            Open Historia
          </span>
          <SocialLinks />
        </header>

        <div className="flex flex-1 flex-col justify-center py-12">
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl">
            Pick a game to play.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground text-pretty">
            A collection of open-source, AI-driven games. Each one runs on your
            own model through OpenRouter — connect once and play any of them.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {GAMES.map((game) => (
              <Link
                key={game.href}
                href={game.href}
                className="group flex flex-col rounded-xl border border-border bg-card/40 p-5 transition-colors hover:border-primary hover:bg-card"
              >
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <HugeiconsIcon icon={game.icon} strokeWidth={2} />
                </span>
                <span className="mt-4 text-lg font-semibold text-foreground">
                  {game.title}
                </span>
                <span className="mt-1.5 flex-1 text-sm text-muted-foreground">
                  {game.tagline}
                </span>
                <span className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary">
                  Play
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            ))}
          </div>
        </div>

        <footer className="flex items-center gap-2 text-sm text-muted-foreground">
          <HugeiconsIcon icon={Coffee02Icon} strokeWidth={2} className="size-4" />
          Bring your own model. Your OpenRouter key never leaves your browser.
        </footer>
      </div>
    </main>
  )
}
