"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  RefreshIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"

import { OPENROUTER_FREE_MODEL } from "@workspace/engine"
import {
  EMPTY_LOVE_INTEREST,
  SCENARIO_LABELS,
  SCENARIOS,
  type Flirtation,
  type LoveInterest,
  type Scenario,
} from "@workspace/seduction-engine"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { engine } from "@/games/charm/lib/engine"
import { formatGenerateInterestError } from "@/games/charm/lib/errors"
import { getPreferFreeRotation } from "@/games/charm/lib/openrouter"

const SCENARIO_TAGLINES: Record<Scenario, string> = {
  "cocktail-bar": "Low light, good music, a line that has to carry.",
  bookshop: "Narrow aisles, lamplight, minutes from closing.",
  masquerade: "Masks on, real names off, candlelight everywhere.",
  coffeehouse: "A grey afternoon and the last free seat.",
  "art-gallery": "Wine, pretension, and art to talk over.",
  "rooftop-party": "Golden hour, city lights, the crowd thinning.",
  "night-train": "Two strangers, one carriage, nowhere to be.",
  wedding: "Seated together at a stranger's reception.",
}

type Step = "scene" | "person"

const freeModelOpts = () =>
  getPreferFreeRotation() ? { model: OPENROUTER_FREE_MODEL } : {}

export function NewFlirtationDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (flirtation: Flirtation) => void
}) {
  const [step, setStep] = useState<Step>("scene")
  const [scenario, setScenario] = useState<Scenario>("cocktail-bar")
  const [premise, setPremise] = useState("")
  const [interest, setInterest] = useState<LoveInterest>(EMPTY_LOVE_INTEREST)
  const [creating, setCreating] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setStep("scene")
    setScenario("cocktail-bar")
    setPremise("")
    setInterest(EMPTY_LOVE_INTEREST)
    setError(null)
    setCreating(false)
    setGenerating(false)
  }

  const setField = (key: keyof LoveInterest, value: string) =>
    setInterest((c) => ({ ...c, [key]: value }))

  const generate = async () => {
    setGenerating(true)
    setError(null)
    const result = await engine.generateInterest({
      scenario,
      premise: premise.trim() || undefined,
      hint: interest.name.trim() || undefined,
      seed: interest,
      language: "English",
      ...freeModelOpts(),
    })
    setGenerating(false)
    result.match({
      ok: setInterest,
      err: (e) => setError(formatGenerateInterestError(e)),
    })
  }

  const reroll = async () => {
    setGenerating(true)
    setError(null)
    const result = await engine.generateInterest({
      scenario,
      premise: premise.trim() || undefined,
      language: "English",
      ...freeModelOpts(),
    })
    setGenerating(false)
    result.match({
      ok: setInterest,
      err: (e) => setError(formatGenerateInterestError(e)),
    })
  }

  const begin = async () => {
    setCreating(true)
    setError(null)
    const result = await engine.createFlirtation({
      scenario,
      premise,
      interest,
      language: "English",
      ...freeModelOpts(),
    })
    setCreating(false)
    result.match({
      ok: (flirtation) => {
        reset()
        onCreated(flirtation)
      },
      err: () =>
        setError("Could not start the encounter. Your storage may be blocked."),
    })
  }

  const busy = creating || generating
  const canBegin = interest.name.trim().length > 0 && !busy

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg" closeLabel="Close">
        <DialogHeader>
          New encounter
          <Stepper step={step} />
        </DialogHeader>

        {step === "scene" ? (
          <SceneStep
            scenario={scenario}
            onScenario={setScenario}
            premise={premise}
            onPremise={setPremise}
          />
        ) : (
          <PersonStep
            interest={interest}
            onField={setField}
            onGenerate={() => void generate()}
            onReroll={() => void reroll()}
            generating={generating}
          />
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          {step === "scene" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStep("person")}>
                Next: who you&apos;ll meet
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("scene")}
                disabled={busy}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
                Back
              </Button>
              <Button onClick={() => void begin()} disabled={!canBegin}>
                {creating ? (
                  <Spinner />
                ) : (
                  <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />
                )}
                Begin
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Stepper({ step }: { step: Step }) {
  return (
    <span className="ms-auto flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
      <Dot active={step === "scene"} label="Scene" n={1} />
      <span className="h-px w-3 bg-border" />
      <Dot active={step === "person"} label="Them" n={2} />
    </span>
  )
}

function Dot({
  active,
  label,
  n,
}: {
  active: boolean
  label: string
  n: number
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-1",
        active ? "text-foreground" : "text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded-full text-[0.65rem] font-semibold",
          active
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {n}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </span>
  )
}

function SceneStep({
  scenario,
  onScenario,
  premise,
  onPremise,
}: {
  scenario: Scenario
  onScenario: (s: Scenario) => void
  premise: string
  onPremise: (p: string) => void
}) {
  return (
    <div className="grid gap-4">
      <DialogDescription>
        Pick where you meet and, if you like, set the scene. Who you&apos;re
        charming comes next.
      </DialogDescription>

      <div>
        <SectionLabel>Setting</SectionLabel>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SCENARIOS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onScenario(s)}
              className={cn(
                "flex h-full cursor-pointer flex-col gap-0.5 rounded-lg border p-2.5 text-start transition-colors",
                scenario === s
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background hover:bg-muted"
              )}
            >
              <span className="text-sm font-medium">{SCENARIO_LABELS[s]}</span>
              <span className="text-[0.7rem] leading-tight text-muted-foreground">
                {SCENARIO_TAGLINES[s]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-1.5">
        <SectionLabel htmlFor="premise">
          Premise <span className="font-normal normal-case">(optional)</span>
        </SectionLabel>
        <Textarea
          id="premise"
          value={premise}
          onChange={(e) => onPremise(e.target.value)}
          placeholder="A hook, a history, a reason you're both here. Leave blank to let it unfold."
          maxLength={400}
          className="min-h-20"
        />
      </div>
    </div>
  )
}

function PersonStep({
  interest,
  onField,
  onGenerate,
  onReroll,
  generating,
}: {
  interest: LoveInterest
  onField: (key: keyof LoveInterest, value: string) => void
  onGenerate: () => void
  onReroll: () => void
  generating: boolean
}) {
  const hasAny = Object.values(interest).some((v) => v.trim().length > 0)

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <DialogDescription className="m-0">
          Sketch the person you&apos;re hoping to charm, or let the AI dream one
          up. Every field is optional.
        </DialogDescription>
        <div className="flex shrink-0 items-center gap-1.5">
          {hasAny && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReroll}
              disabled={generating}
              title="Discard and dream up someone new"
            >
              <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} />
              Reroll
            </Button>
          )}
          <Button size="sm" onClick={onGenerate} disabled={generating}>
            {generating ? (
              <Spinner />
            ) : (
              <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />
            )}
            {hasAny ? "Fill the blanks" : "Generate with AI"}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "-mx-1 grid max-h-[48vh] gap-3 overflow-y-auto px-1 pb-1 transition-opacity",
          generating && "pointer-events-none opacity-60"
        )}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <Input
              value={interest.name}
              onChange={(e) => onField("name", e.target.value)}
              placeholder="e.g. Juliette"
              maxLength={60}
            />
          </Field>
          <Field label="Pronouns">
            <Input
              value={interest.pronouns}
              onChange={(e) => onField("pronouns", e.target.value)}
              placeholder="e.g. she/her"
              maxLength={30}
            />
          </Field>
          <Field label="Age">
            <Input
              value={interest.age}
              onChange={(e) => onField("age", e.target.value)}
              placeholder="e.g. late 20s (adult)"
              maxLength={30}
            />
          </Field>
          <Field label="Vibe">
            <Input
              value={interest.vibe}
              onChange={(e) => onField("vibe", e.target.value)}
              placeholder="e.g. Aloof jazz pianist"
              maxLength={60}
            />
          </Field>
        </div>

        <Field label="Appearance">
          <Textarea
            value={interest.appearance}
            onChange={(e) => onField("appearance", e.target.value)}
            placeholder="A few defining physical details."
            maxLength={300}
            className="min-h-14"
          />
        </Field>
        <Field label="Personality">
          <Textarea
            value={interest.personality}
            onChange={(e) => onField("personality", e.target.value)}
            placeholder="What charms them, what bores them, where they have edges."
            maxLength={300}
            className="min-h-14"
          />
        </Field>
        <Field label="Background">
          <Textarea
            value={interest.background}
            onChange={(e) => onField("background", e.target.value)}
            placeholder="Where they come from and where they stand in life."
            maxLength={400}
            className="min-h-14"
          />
        </Field>
        <Field label="Looking for">
          <Textarea
            value={interest.lookingFor}
            onChange={(e) => onField("lookingFor", e.target.value)}
            placeholder="What they're quietly hoping for tonight - or insist they're not."
            maxLength={300}
            className="min-h-14"
          />
        </Field>
      </div>
    </div>
  )
}

function SectionLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode
  htmlFor?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-xs font-medium tracking-wide text-muted-foreground uppercase"
    >
      {children}
    </label>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </div>
  )
}
