"use client"

import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Delete02Icon,
  PlayIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"

import { GENRE_LABELS, type Adventure } from "@workspace/adventure-engine"

import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"

import { AdventureScreen } from "@/components/adventure/adventure-screen"
import { NewAdventureDialog } from "@/components/adventure/new-adventure-dialog"
import { ConnectDialog } from "@/components/openrouter/connect-dialog"
import { OpenRouterLogo } from "@/components/openrouter/openrouter-logo"
import { useOpenRouter } from "@/hooks/use-openrouter"
import { engine } from "@/lib/engine"

export function Home() {
  const { status } = useOpenRouter()
  const [adventure, setAdventure] = useState<Adventure | null>(null)
  const [adventures, setAdventures] = useState<Adventure[]>([])
  const [loading, setLoading] = useState(true)
  const [newOpen, setNewOpen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)

  const refresh = async () => {
    const list = await engine.listAdventures()
    if (list.isOk()) {
      setAdventures(
        [...list.value].sort((a, b) => b.updatedAt - a.updatedAt)
      )
    }
  }

  useEffect(() => {
    let active = true
    void (async () => {
      const list = await engine.listAdventures()
      if (!active) return
      if (list.isOk()) {
        const sorted = [...list.value].sort((a, b) => b.updatedAt - a.updatedAt)
        setAdventures(sorted)
      }
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [])

  const startNew = () => {
    if (status === "disconnected") {
      setConnectOpen(true)
      return
    }
    setNewOpen(true)
  }

  const onCreated = (created: Adventure) => {
    setNewOpen(false)
    setAdventure(created)
  }

  const exitToMenu = () => {
    setAdventure(null)
    void refresh()
  }

  const deleteAdventure = async (id: string) => {
    await engine.deleteAdventure(id)
    void refresh()
  }

  if (adventure) {
    return (
      <>
        <AdventureScreen
          adventure={adventure}
          onAdventureChange={setAdventure}
          onExit={exitToMenu}
          onNewAdventure={() => {
            setAdventure(null)
            void refresh()
            setNewOpen(true)
          }}
        />
        <NewAdventureDialog
          open={newOpen}
          onOpenChange={setNewOpen}
          onCreated={onCreated}
        />
      </>
    )
  }

  return (
    <main className="relative min-h-svh w-full overflow-y-auto bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,theme(colors.primary/15),transparent_60%)]" />

      <div className="relative mx-auto flex min-h-svh w-full max-w-3xl flex-col px-5 py-10">
        <header className="flex items-center justify-between">
          <span className="font-heading text-sm font-semibold tracking-[0.25em] text-foreground uppercase">
            Open Odyssey
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConnectOpen(true)}
          >
            <OpenRouterLogo className="size-3.5" />
            {status === "connected" ? "Connected" : "Connect"}
          </Button>
        </header>

        <div className="flex flex-1 flex-col justify-center py-12">
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl">
            Write your own legend.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground text-pretty">
            An AI-driven choose-your-own-adventure. Pick a world, name your
            hero, and shape the story one choice at a time. Bring your own model
            through OpenRouter.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={startNew}>
              <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />
              New adventure
            </Button>
            {status === "disconnected" && (
              <span className="text-sm text-muted-foreground">
                Connect OpenRouter to begin.
              </span>
            )}
          </div>

          {/* Saved adventures to resume. */}
          {loading ? (
            <div className="mt-12 flex items-center gap-2 text-muted-foreground">
              <Spinner />
              Loading your adventures...
            </div>
          ) : adventures.length > 0 ? (
            <div className="mt-12">
              <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Continue
              </h2>
              <ul className="flex flex-col gap-2">
                {adventures.map((a) => (
                  <li
                    key={a.id}
                    className="group flex items-center gap-3 rounded-lg border border-border bg-card/40 px-3.5 py-3 transition-colors hover:bg-card"
                  >
                    <button
                      type="button"
                      onClick={() => setAdventure(a)}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-start"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <HugeiconsIcon icon={PlayIcon} strokeWidth={2} />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium text-foreground">
                          {a.title}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {GENRE_LABELS[a.genre]}
                          {a.status === "ended" ? " · Finished" : ""}
                        </span>
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete adventure"
                      onClick={() => void deleteAdventure(a.id)}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <button
              type="button"
              onClick={startNew}
              className="mt-12 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
              No adventures yet. Start your first one.
            </button>
          )}
        </div>
      </div>

      <NewAdventureDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={onCreated}
      />
      <ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
    </main>
  )
}
