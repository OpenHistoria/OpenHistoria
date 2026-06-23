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
  EMPTY_CHARACTER,
  GENRE_LABELS,
  GENRES,
  type Adventure,
  type Character,
  type Genre,
} from "@workspace/adventure-engine"

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
import { formatGenerateCharacterError } from "@/lib/errors"
import { getPreferFreeRotation } from "@/lib/openrouter"

const GENRE_TAGLINES: Record<Genre, string> = {
  fantasy: "Kingdoms, old magic, buried evils.",
  scifi: "Starships, alien contact, system-wide politics.",
  horror: "Dread and the uncanny, dawn never promised.",
  mystery: "A rain-slick city and a deadly truth.",
  western: "Dust, iron, and superstitions that bite.",
  cyberpunk: "Neon, corporations, cheap lives.",
  postapocalyptic: "After the collapse, survival is the only law.",
  pirate: "Storms, mutiny, and buried fortunes.",
}

type Step = "world" | "character"

const freeModelOpts = () =>
  getPreferFreeRotation() ? { model: OPENROUTER_FREE_MODEL } : {}

export function NewAdventureDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (adventure: Adventure) => void
}) {
  const [step, setStep] = useState<Step>("world")
  const [genre, setGenre] = useState<Genre>("fantasy")
  const [premise, setPremise] = useState("")
  const [character, setCharacter] = useState<Character>(EMPTY_CHARACTER)
  const [creating, setCreating] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setStep("world")
    setGenre("fantasy")
    setPremise("")
    setCharacter(EMPTY_CHARACTER)
    setError(null)
    setCreating(false)
    setGenerating(false)
  }

  const setField = (key: keyof Character, value: string) =>
    setCharacter((c) => ({ ...c, [key]: value }))

  const generate = async () => {
    setGenerating(true)
    setError(null)
    const result = await engine.generateCharacter({
      genre,
      premise: premise.trim() || undefined,
      hint: character.name.trim() || undefined,
      seed: character,
      language: "English",
      ...freeModelOpts(),
    })
    setGenerating(false)
    result.match({
      ok: setCharacter,
      err: (e) => setError(formatGenerateCharacterError(e)),
    })
  }

  const reroll = async () => {
    setGenerating(true)
    setError(null)
    const result = await engine.generateCharacter({
      genre,
      premise: premise.trim() || undefined,
      language: "English",
      ...freeModelOpts(),
    })
    setGenerating(false)
    result.match({
      ok: setCharacter,
      err: (e) => setError(formatGenerateCharacterError(e)),
    })
  }

  const begin = async () => {
    setCreating(true)
    setError(null)
    const result = await engine.createAdventure({
      genre,
      premise,
      character,
      language: "English",
      ...freeModelOpts(),
    })
    setCreating(false)
    result.match({
      ok: (adventure) => {
        reset()
        onCreated(adventure)
      },
      err: () =>
        setError("Could not start the adventure. Your storage may be blocked."),
    })
  }

  const busy = creating || generating
  const canBegin = character.name.trim().length > 0 && !busy

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
          New adventure
          <Stepper step={step} />
        </DialogHeader>

        {step === "world" ? (
          <WorldStep
            genre={genre}
            onGenre={setGenre}
            premise={premise}
            onPremise={setPremise}
          />
        ) : (
          <CharacterStep
            character={character}
            onField={setField}
            onGenerate={() => void generate()}
            onReroll={() => void reroll()}
            generating={generating}
          />
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter>
          {step === "world" ? (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => setStep("character")}>
                Next: character
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("world")}
                disabled={busy}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
                Back
              </Button>
              <Button onClick={() => void begin()} disabled={!canBegin}>
                {creating ? <Spinner /> : <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />}
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
      <Dot active={step === "world"} label="World" n={1} />
      <span className="h-px w-3 bg-border" />
      <Dot active={step === "character"} label="Character" n={2} />
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

function WorldStep({
  genre,
  onGenre,
  premise,
  onPremise,
}: {
  genre: Genre
  onGenre: (g: Genre) => void
  premise: string
  onPremise: (p: string) => void
}) {
  return (
    <div className="grid gap-4">
      <DialogDescription>
        Choose a world and, if you like, set the scene. Your character comes
        next.
      </DialogDescription>

      <div>
        <SectionLabel>World</SectionLabel>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GENRES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onGenre(g)}
              className={cn(
                "flex h-full cursor-pointer flex-col gap-0.5 rounded-lg border p-2.5 text-start transition-colors",
                genre === g
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background hover:bg-muted"
              )}
            >
              <span className="text-sm font-medium">{GENRE_LABELS[g]}</span>
              <span className="text-[0.7rem] leading-tight text-muted-foreground">
                {GENRE_TAGLINES[g]}
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
          placeholder="A hook, a goal, a twist. Leave blank to let the storyteller decide."
          maxLength={400}
          className="min-h-20"
        />
      </div>
    </div>
  )
}

function CharacterStep({
  character,
  onField,
  onGenerate,
  onReroll,
  generating,
}: {
  character: Character
  onField: (key: keyof Character, value: string) => void
  onGenerate: () => void
  onReroll: () => void
  generating: boolean
}) {
  const hasAny = Object.values(character).some((v) => v.trim().length > 0)

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <DialogDescription className="m-0">
          Shape your hero, or let the AI invent one. Every field is optional.
        </DialogDescription>
        <div className="flex shrink-0 items-center gap-1.5">
          {hasAny && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReroll}
              disabled={generating}
              title="Discard and generate a fresh character"
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
              value={character.name}
              onChange={(e) => onField("name", e.target.value)}
              placeholder="e.g. Mara Vance"
              maxLength={60}
            />
          </Field>
          <Field label="Pronouns">
            <Input
              value={character.pronouns}
              onChange={(e) => onField("pronouns", e.target.value)}
              placeholder="e.g. she/her"
              maxLength={30}
            />
          </Field>
          <Field label="Age">
            <Input
              value={character.age}
              onChange={(e) => onField("age", e.target.value)}
              placeholder="e.g. late 30s"
              maxLength={30}
            />
          </Field>
          <Field label="Role">
            <Input
              value={character.archetype}
              onChange={(e) => onField("archetype", e.target.value)}
              placeholder="e.g. Disgraced knight"
              maxLength={60}
            />
          </Field>
        </div>

        <Field label="Appearance">
          <Textarea
            value={character.appearance}
            onChange={(e) => onField("appearance", e.target.value)}
            placeholder="A few defining physical details."
            maxLength={300}
            className="min-h-14"
          />
        </Field>
        <Field label="Personality">
          <Textarea
            value={character.personality}
            onChange={(e) => onField("personality", e.target.value)}
            placeholder="Temperament, strengths, flaws."
            maxLength={300}
            className="min-h-14"
          />
        </Field>
        <Field label="Background">
          <Textarea
            value={character.background}
            onChange={(e) => onField("background", e.target.value)}
            placeholder="Where they come from and where they stand now."
            maxLength={400}
            className="min-h-14"
          />
        </Field>
        <Field label="Motivation">
          <Textarea
            value={character.motivation}
            onChange={(e) => onField("motivation", e.target.value)}
            placeholder="What drives them into the story."
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
