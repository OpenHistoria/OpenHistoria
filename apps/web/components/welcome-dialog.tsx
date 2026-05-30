"use client"

import {
  REFORM_AGENDAS,
  WORLD_COUNTRIES,
  type CountryListEntry,
  type ReformAgendaId,
} from "@workspace/engine"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { cn } from "@workspace/ui/lib/utils"
import { Loader2Icon } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { CountryFlag } from "@/components/country-flag"
import { CountryPicker } from "@/components/country-picker"
import { useGame, useGameActions } from "@/components/game-provider"
import { buildNewGameOptions } from "@/lib/new-game"

const STORAGE_KEY = "openhistoria:welcome-shown"

type Step = "country" | "agenda"

function entryForNation(code: string): CountryListEntry {
  return (
    WORLD_COUNTRIES.find((c) => c.code === code) ?? { code, name: code }
  )
}

export function WelcomeDialog() {
  const game = useGame()
  const { setReformAgenda, newGame } = useGameActions()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("country")
  const [country, setCountry] = useState<CountryListEntry | null>(null)
  const [selected, setSelected] = useState<ReformAgendaId | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!game) return
    if (typeof window === "undefined") return
    if (!country) setCountry(entryForNation(game.nation))
    // Always show until an agenda has been picked — agendas + country are
    // load-bearing for the run.
    if (!game.reformAgenda) {
      setOpen(true)
      return
    }
    if (window.localStorage.getItem(STORAGE_KEY) === "1") return
    setOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game])

  const needsAgenda = !!game && !game.reformAgenda

  function close() {
    setOpen(false)
    try {
      window.localStorage.setItem(STORAGE_KEY, "1")
    } catch {
      // ignore
    }
  }

  async function commit() {
    if (!country || !selected) return
    setBusy(true)
    try {
      const opts = await buildNewGameOptions(country)
      newGame(opts)
      setReformAgenda(selected)
      close()
      setStep("country")
    } catch (e) {
      toast.error("Could not start that country", {
        description: e instanceof Error ? e.message : String(e),
      })
    } finally {
      setBusy(false)
    }
  }

  const leaderName = game?.stats.government.headOfState ?? "your leader"

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setOpen(true)
        else if (!needsAgenda) close()
      }}
    >
      <DialogContent className="sm:max-w-xl" showCloseButton={!needsAgenda}>
        <DialogHeader>
          <DialogTitle>Welcome to Open Historia</DialogTitle>
          <DialogDescription>
            {step === "country"
              ? "Choose any country in the world. You take charge of its current leader, starting today."
              : country
                ? `You lead ${country.name}. Pick the legacy your mandate will be judged on.`
                : `You are ${leaderName}. Pick the legacy your mandate will be judged on.`}
          </DialogDescription>
        </DialogHeader>

        {step === "country" ? (
          <div className="grid gap-3">
            <CountryPicker
              selected={country?.code ?? null}
              onSelect={setCountry}
            />
            {country && (
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                <CountryFlag
                  code={country.code}
                  title={country.name}
                  className="h-4 w-auto rounded-[1px] ring-1 ring-black/15"
                />
                <span className="font-medium">{country.name}</span>
                <span className="text-xs text-muted-foreground">
                  selected
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-2.5 text-sm">
            {REFORM_AGENDAS.map((a) => {
              const isSelected = selected === a.id
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelected(a.id)}
                  className={cn(
                    "rounded-md border bg-card px-3 py-2 text-left transition-colors",
                    isSelected
                      ? "border-primary ring-2 ring-primary/40"
                      : "hover:border-primary/60"
                  )}
                  aria-pressed={isSelected}
                >
                  <div className="font-medium leading-tight">{a.title}</div>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                    {a.description}
                  </p>
                </button>
              )
            })}
            <div className="mt-2 grid gap-2.5">
              <Section
                title="How it works"
                body="Each decision becomes a project on the map: it costs upfront, drains the treasury, and pays back approval and GDP on completion. Crises and opportunities arrive at scheduled and random times — only the big ones pause the game."
              />
              <Section
                title="Treasury & approval"
                body="Issue bonds to refill the treasury (at the cost of debt and approval), or take a media tour for a quick approval bump. If treasury crashes or approval collapses for too long, your mandate ends."
              />
              <Section
                title="Shortcuts"
                body="Space pauses, 1–5 sets speed, D toggles decisions, S toggles country stats, B toggles the briefing log, Esc opens the pause menu. Backtick (`) opens the debug overlay."
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "country" ? (
            <Button
              onClick={() => setStep("agenda")}
              disabled={!country}
            >
              Next: choose your legacy
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("country")}
                disabled={busy}
              >
                Back
              </Button>
              <Button onClick={commit} disabled={!selected || busy}>
                {busy ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Forming government…
                  </>
                ) : (
                  "Start governing"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="font-medium leading-tight">{title}</div>
      <p className="text-xs text-muted-foreground leading-snug">{body}</p>
    </div>
  )
}
