"use client"

import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Delete02Icon,
  FavouriteIcon,
  PlayIcon,
} from "@hugeicons/core-free-icons"

import { SCENARIO_LABELS, type Flirtation } from "@workspace/seduction-engine"

import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"

import { FlirtationScreen } from "@/games/charm/components/charm/flirtation-screen"
import { NewFlirtationDialog } from "@/games/charm/components/charm/new-flirtation-dialog"
import { ConnectDialog } from "@/games/charm/components/openrouter/connect-dialog"
import { OpenRouterLogo } from "@/games/charm/components/openrouter/openrouter-logo"
import { useOpenRouter } from "@/games/charm/hooks/use-openrouter"
import { engine } from "@/games/charm/lib/engine"
import { HubLink } from "@/components/hub-link"
import { Backdrop } from "@/components/backdrop"

export function Home() {
  const { status } = useOpenRouter()
  const [flirtation, setFlirtation] = useState<Flirtation | null>(null)
  const [flirtations, setFlirtations] = useState<Flirtation[]>([])
  const [loading, setLoading] = useState(true)
  const [newOpen, setNewOpen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)

  const refresh = async () => {
    const list = await engine.listFlirtations()
    if (list.isOk()) {
      setFlirtations([...list.value].sort((a, b) => b.updatedAt - a.updatedAt))
    }
  }

  useEffect(() => {
    let active = true
    void (async () => {
      const list = await engine.listFlirtations()
      if (!active) return
      if (list.isOk()) {
        const sorted = [...list.value].sort((a, b) => b.updatedAt - a.updatedAt)
        setFlirtations(sorted)
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

  const onCreated = (created: Flirtation) => {
    setNewOpen(false)
    setFlirtation(created)
  }

  const exitToMenu = () => {
    setFlirtation(null)
    void refresh()
  }

  const deleteFlirtation = async (id: string) => {
    await engine.deleteFlirtation(id)
    void refresh()
  }

  if (flirtation) {
    return (
      <>
        <FlirtationScreen
          flirtation={flirtation}
          onFlirtationChange={setFlirtation}
          onExit={exitToMenu}
          onNewFlirtation={() => {
            setFlirtation(null)
            void refresh()
            setNewOpen(true)
          }}
        />
        <NewFlirtationDialog
          open={newOpen}
          onOpenChange={setNewOpen}
          onCreated={onCreated}
        />
      </>
    )
  }

  return (
    <main className="relative min-h-svh w-full overflow-y-auto bg-background">
      <Backdrop />

      <div className="relative mx-auto flex min-h-svh w-full max-w-3xl flex-col px-5 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HubLink />
            <span className="font-heading text-sm font-semibold tracking-[0.25em] text-foreground uppercase">
              Open Charm
            </span>
          </div>
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
            Win them over.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground text-pretty">
            An AI-driven romance game. Pick a setting, meet someone worth
            charming, and earn it one line at a time. Bring your own model
            through OpenRouter.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={startNew}>
              <HugeiconsIcon icon={FavouriteIcon} strokeWidth={2} />
              New encounter
            </Button>
            {status === "disconnected" && (
              <span className="text-sm text-muted-foreground">
                Connect OpenRouter to begin.
              </span>
            )}
          </div>

          {/* Saved flirtations to resume. */}
          {loading ? (
            <div className="mt-12 flex items-center gap-2 text-muted-foreground">
              <Spinner />
              Loading your encounters...
            </div>
          ) : flirtations.length > 0 ? (
            <div className="mt-12">
              <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Continue
              </h2>
              <ul className="flex flex-col gap-2">
                {flirtations.map((f) => (
                  <li
                    key={f.id}
                    className="group flex items-center gap-3 rounded-lg border border-border bg-card/40 px-3.5 py-3 transition-colors hover:bg-card"
                  >
                    <button
                      type="button"
                      onClick={() => setFlirtation(f)}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-start"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <HugeiconsIcon icon={PlayIcon} strokeWidth={2} />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium text-foreground">
                          {f.title}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {SCENARIO_LABELS[f.scenario]}
                          {f.status === "ended" ? " · Ended" : ""}
                        </span>
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete encounter"
                      onClick={() => void deleteFlirtation(f.id)}
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
              No encounters yet. Start your first one.
            </button>
          )}
        </div>
      </div>

      <NewFlirtationDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={onCreated}
      />
      <ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
    </main>
  )
}
