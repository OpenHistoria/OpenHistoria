"use client"

import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Delete02Icon,
  PlayIcon,
  SearchVisualIcon,
} from "@hugeicons/core-free-icons"

import {
  DIFFICULTY_LABELS,
  SETTING_LABELS,
  type Case,
} from "@workspace/detective-engine"

import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"

import { CaseScreen } from "@/components/case/case-screen"
import { NewCaseDialog } from "@/components/case/new-case-dialog"
import { ConnectDialog } from "@/components/openrouter/connect-dialog"
import { OpenRouterLogo } from "@/components/openrouter/openrouter-logo"
import { useOpenRouter } from "@/hooks/use-openrouter"
import { engine } from "@/lib/engine"

const STATUS_LABEL: Record<Case["status"], string> = {
  active: "Open",
  solved: "Solved",
  failed: "Cold",
}

// Layered, cinematic noir backdrop: a cold overhead "interrogation" light, a
// warm desk-lamp pool, a cool counter-glow for depth, a vignette to pull focus
// to the center, and fine film grain over the top. Replaces the flat top glow.
function Atmosphere() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Cold overhead light — the interrogation lamp. */}
      <div
        className="absolute inset-x-0 -top-[18%] h-[80vh]"
        style={{
          background:
            "radial-gradient(54% 56% at 50% 0%, oklch(0.82 0.06 236 / 0.32), transparent 70%)",
        }}
      />
      {/* Warm desk-lamp pool, lower-right — the noir hint of amber. */}
      <div
        className="absolute -right-[6%] -bottom-[14%] h-[60vh] w-[60vh]"
        style={{
          background:
            "radial-gradient(circle at center, oklch(0.77 0.11 62 / 0.22), transparent 64%)",
        }}
      />
      {/* Cool counter-glow, lower-left, to balance the warm pool. */}
      <div
        className="absolute -bottom-[22%] -left-[12%] h-[54vh] w-[54vh]"
        style={{
          background:
            "radial-gradient(circle at center, oklch(0.64 0.07 256 / 0.16), transparent 62%)",
        }}
      />
      {/* Vignette — darkens the corners and pulls the eye to the headline. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(125% 105% at 50% 28%, transparent 38%, oklch(0.03 0 0 / 0.72) 100%)",
        }}
      />
      {/* Fine film grain for texture and depth. */}
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  )
}

export function Home() {
  const { status } = useOpenRouter()
  const [theCase, setCase] = useState<Case | null>(null)
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [newOpen, setNewOpen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)

  const refresh = async () => {
    const list = await engine.listCases()
    if (list.isOk()) {
      setCases([...list.value].sort((a, b) => b.updatedAt - a.updatedAt))
    }
  }

  useEffect(() => {
    let active = true
    void (async () => {
      const list = await engine.listCases()
      if (!active) return
      if (list.isOk()) {
        setCases([...list.value].sort((a, b) => b.updatedAt - a.updatedAt))
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

  const onCreated = (created: Case) => {
    setNewOpen(false)
    setCase(created)
  }

  const exitToMenu = () => {
    setCase(null)
    void refresh()
  }

  const deleteCase = async (id: string) => {
    await engine.deleteCase(id)
    void refresh()
  }

  if (theCase) {
    return (
      <>
        <CaseScreen
          theCase={theCase}
          onCaseChange={setCase}
          onExit={exitToMenu}
          onNewCase={() => {
            setCase(null)
            void refresh()
            setNewOpen(true)
          }}
        />
        <NewCaseDialog
          open={newOpen}
          onOpenChange={setNewOpen}
          onCreated={onCreated}
        />
      </>
    )
  }

  return (
    <main className="relative min-h-svh w-full overflow-y-auto bg-background">
      <Atmosphere />

      <div className="relative mx-auto flex min-h-svh w-full max-w-3xl flex-col px-5 py-10">
        <header className="flex items-center justify-between">
          <span className="font-heading text-sm font-semibold tracking-[0.25em] text-foreground uppercase">
            Open Case
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
            Every case is a fresh murder.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground text-pretty">
            An AI-driven detective game. The case file - victim, suspects, and
            the guilty party - is invented for you. Examine the scene, press the
            suspects, follow the leads, and name the killer. Bring your own
            model through OpenRouter.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={startNew}>
              <HugeiconsIcon icon={SearchVisualIcon} strokeWidth={2} />
              New case
            </Button>
            {status === "disconnected" && (
              <span className="text-sm text-muted-foreground">
                Connect OpenRouter to begin.
              </span>
            )}
          </div>

          {/* Saved cases to resume. */}
          {loading ? (
            <div className="mt-12 flex items-center gap-2 text-muted-foreground">
              <Spinner />
              Loading your case files...
            </div>
          ) : cases.length > 0 ? (
            <div className="mt-12">
              <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Case files
              </h2>
              <ul className="flex flex-col gap-2">
                {cases.map((c) => (
                  <li
                    key={c.id}
                    className="group flex items-center gap-3 rounded-lg border border-border bg-card/40 px-3.5 py-3 transition-colors hover:bg-card"
                  >
                    <button
                      type="button"
                      onClick={() => setCase(c)}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-start"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <HugeiconsIcon icon={PlayIcon} strokeWidth={2} />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium text-foreground">
                          {c.title}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {SETTING_LABELS[c.setting]} ·{" "}
                          {DIFFICULTY_LABELS[c.difficulty]} ·{" "}
                          {STATUS_LABEL[c.status]}
                        </span>
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete case"
                      onClick={() => void deleteCase(c.id)}
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
              No cases yet. Open your first one.
            </button>
          )}
        </div>
      </div>

      <NewCaseDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={onCreated}
      />
      <ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
    </main>
  )
}
