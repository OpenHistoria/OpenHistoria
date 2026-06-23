"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  SearchVisualIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"

import { OPENROUTER_FREE_MODEL } from "@workspace/engine"
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  EMPTY_DETECTIVE,
  SETTING_LABELS,
  SETTINGS,
  type Case,
  type Detective,
  type Difficulty,
  type Setting,
} from "@workspace/detective-engine"

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

import { engine } from "@/lib/engine"
import {
  formatCreateCaseError,
  formatGenerateDetectiveError,
} from "@/lib/errors"
import { getPreferFreeRotation } from "@/lib/openrouter"

const SETTING_TAGLINES: Record<Setting, string> = {
  manor: "A storm-locked estate of old money and older grudges.",
  noir: "Smoke, rain, and dames who spell trouble.",
  victorian: "Gaslight, séances, and respectable men with secrets.",
  express: "A killer sealed aboard a night train.",
  academia: "Jealous dons and ambition sharp enough to kill.",
  island: "The boat won't return, and the guests keep dying.",
  cyberpunk: "Edited memories and bought alibis in the neon.",
  occult: "A murder masked as the supernatural.",
}

const DIFFICULTY_TAGLINES: Record<Difficulty, string> = {
  rookie: "Few suspects, a clean trail.",
  detective: "Real red herrings and clues to connect.",
  mastermind: "A devious culprit hiding behind an innocent.",
}

type Step = "case" | "detective"

const freeModelOpts = () =>
  getPreferFreeRotation()
    ? { model: OPENROUTER_FREE_MODEL, fallbackModels: [] as string[] }
    : {}

export function NewCaseDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (theCase: Case) => void
}) {
  const [step, setStep] = useState<Step>("case")
  const [setting, setSetting] = useState<Setting>("manor")
  const [difficulty, setDifficulty] = useState<Difficulty>("detective")
  const [premise, setPremise] = useState("")
  const [detective, setDetective] = useState<Detective>(EMPTY_DETECTIVE)
  const [creating, setCreating] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setStep("case")
    setSetting("manor")
    setDifficulty("detective")
    setPremise("")
    setDetective(EMPTY_DETECTIVE)
    setError(null)
    setCreating(false)
    setGenerating(false)
  }

  const setField = (key: keyof Detective, value: string) =>
    setDetective((d) => ({ ...d, [key]: value }))

  const generate = async () => {
    setGenerating(true)
    setError(null)
    const result = await engine.generateDetective({
      setting,
      premise,
      language: "English",
      ...freeModelOpts(),
    })
    setGenerating(false)
    result.match({
      ok: (d) => setDetective(d),
      err: (e) => setError(formatGenerateDetectiveError(e)),
    })
  }

  const begin = async () => {
    setCreating(true)
    setError(null)
    const result = await engine.createCase({
      setting,
      difficulty,
      premise,
      detective,
      language: "English",
      ...freeModelOpts(),
    })
    setCreating(false)
    result.match({
      ok: (created) => {
        reset()
        onCreated(created)
      },
      err: (e) => setError(formatCreateCaseError(e)),
    })
  }

  const canBegin =
    detective.name.trim().length > 0 && !creating && !generating

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
          New case
          <Stepper step={step} />
        </DialogHeader>

        {step === "case" ? (
          <CaseStep
            setting={setting}
            onSetting={setSetting}
            difficulty={difficulty}
            onDifficulty={setDifficulty}
            premise={premise}
            onPremise={setPremise}
          />
        ) : (
          <DetectiveStep
            detective={detective}
            onField={setField}
            onGenerate={() => void generate()}
            generating={generating}
          />
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          {step === "case" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setError(null)
                  setStep("detective")
                }}
              >
                Next: detective
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setError(null)
                  setStep("case")
                }}
                disabled={creating || generating}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
                Back
              </Button>
              <Button onClick={() => void begin()} disabled={!canBegin}>
                {creating ? (
                  <Spinner />
                ) : (
                  <HugeiconsIcon icon={SearchVisualIcon} strokeWidth={2} />
                )}
                {creating ? "Building the case..." : "Open case"}
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
      <Dot active={step === "case"} label="Case" n={1} />
      <span className="h-px w-3 bg-border" />
      <Dot active={step === "detective"} label="Detective" n={2} />
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

function CaseStep({
  setting,
  onSetting,
  difficulty,
  onDifficulty,
  premise,
  onPremise,
}: {
  setting: Setting
  onSetting: (s: Setting) => void
  difficulty: Difficulty
  onDifficulty: (d: Difficulty) => void
  premise: string
  onPremise: (p: string) => void
}) {
  return (
    <div className="grid gap-4">
      <DialogDescription>
        Choose a setting and how tough the mystery should be. Add a hook if you
        have one - the case is invented for you either way.
      </DialogDescription>

      <div className="-mx-1 grid max-h-[52vh] gap-4 overflow-y-auto px-1 pb-1">
        <div>
          <SectionLabel>Setting</SectionLabel>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SETTINGS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSetting(s)}
                className={cn(
                  "flex h-full cursor-pointer flex-col gap-0.5 rounded-lg border p-2.5 text-start transition-colors",
                  setting === s
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background hover:bg-muted"
                )}
              >
                <span className="text-sm font-medium">{SETTING_LABELS[s]}</span>
                <span className="text-[0.7rem] leading-tight text-muted-foreground">
                  {SETTING_TAGLINES[s]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>Difficulty</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onDifficulty(d)}
                className={cn(
                  "flex h-full cursor-pointer flex-col gap-0.5 rounded-lg border p-2.5 text-start transition-colors",
                  difficulty === d
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background hover:bg-muted"
                )}
              >
                <span className="text-sm font-medium">
                  {DIFFICULTY_LABELS[d]}
                </span>
                <span className="text-[0.7rem] leading-tight text-muted-foreground">
                  {DIFFICULTY_TAGLINES[d]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-1.5">
          <SectionLabel htmlFor="premise">
            Hook <span className="font-normal normal-case">(optional)</span>
          </SectionLabel>
          <Textarea
            id="premise"
            value={premise}
            onChange={(e) => onPremise(e.target.value)}
            placeholder="A detail to build around: a poisoned toast, a missing heirloom, a locked study. Leave blank to be surprised."
            maxLength={400}
            className="min-h-20"
          />
        </div>
      </div>
    </div>
  )
}

function DetectiveStep({
  detective,
  onField,
  onGenerate,
  generating,
}: {
  detective: Detective
  onField: (key: keyof Detective, value: string) => void
  onGenerate: () => void
  generating: boolean
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-start justify-between gap-3">
        <DialogDescription>
          Who&apos;s working the case? Only a name is required - the rest colors
          how the story is told.
        </DialogDescription>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onGenerate}
          disabled={generating}
          className="shrink-0"
        >
          {generating ? (
            <Spinner />
          ) : (
            <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />
          )}
          {generating ? "Inventing..." : "Generate"}
        </Button>
      </div>

      <div className="-mx-1 grid max-h-[48vh] gap-3 overflow-y-auto px-1 pb-1">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <Input
              value={detective.name}
              onChange={(e) => onField("name", e.target.value)}
              placeholder="e.g. Insp. Cora Vane"
              maxLength={60}
            />
          </Field>
          <Field label="Pronouns">
            <Input
              value={detective.pronouns}
              onChange={(e) => onField("pronouns", e.target.value)}
              placeholder="e.g. she/her"
              maxLength={30}
            />
          </Field>
        </div>
        <Field label="Role">
          <Input
            value={detective.role}
            onChange={(e) => onField("role", e.target.value)}
            placeholder="e.g. Scotland Yard inspector, private eye"
            maxLength={60}
          />
        </Field>
        <Field label="Style">
          <Textarea
            value={detective.style}
            onChange={(e) => onField("style", e.target.value)}
            placeholder="Methodical and cold? Charming and reckless? How do they work?"
            maxLength={300}
            className="min-h-14"
          />
        </Field>
        <Field label="Background">
          <Textarea
            value={detective.background}
            onChange={(e) => onField("background", e.target.value)}
            placeholder="Where they come from and what they carry into the case."
            maxLength={400}
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
