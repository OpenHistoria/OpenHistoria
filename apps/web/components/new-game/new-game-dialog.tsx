"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlayIcon } from "@hugeicons/core-free-icons"

import {
  DEFAULT_MODEL,
  ROTATE_FREE_MODELS,
  type CountryListEntry,
  type Game,
} from "@workspace/engine"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Spinner } from "@workspace/ui/components/spinner"

import { CountryFlag } from "@/components/country-flag"
import { CountryPicker } from "@/components/country-picker"
import { ModelPicker } from "@/components/model-picker"
import { useI18n } from "@/hooks/use-i18n"
import { localizedCountryName } from "@/lib/country-names"
import { engine } from "@/lib/engine"
import { localeLanguageName } from "@/lib/i18n"
import { getPreferFreeRotation } from "@/lib/openrouter"

interface NewGameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (game: Game) => void
}

type Step = "country" | "setup"

/**
 * Two-step new-game flow, modeled on the archived Open Historia welcome
 * dialog: first pick any country, then set the start year (with a short
 * "how it works" primer) and start. Country names are localized throughout.
 */
export function NewGameDialog({
  open,
  onOpenChange,
  onCreated,
}: NewGameDialogProps) {
  const { t, locale } = useI18n()
  const [step, setStep] = useState<Step>("country")
  const [country, setCountry] = useState<CountryListEntry | null>(null)
  const [year, setYear] = useState(engine.maxYear)
  // A directly-injected key (CI agent) opts into the free-model rotation.
  const [model, setModel] = useState<string>(() =>
    getPreferFreeRotation() ? ROTATE_FREE_MODELS : DEFAULT_MODEL
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset to the first step on close, so the next open starts fresh.
  const handleOpenChange = (next: boolean) => {
    if (busy) return
    if (!next) setStep("country")
    onOpenChange(next)
  }

  const yearValid = year >= engine.minYear && year <= engine.maxYear
  const countryName = country
    ? localizedCountryName(country.code, locale, country.name)
    : ""

  const start = async () => {
    if (!country || !yearValid || busy) return
    setBusy(true)
    setError(null)
    const created = await engine.createGame({
      countryCode: country.code,
      countryName: country.name,
      startYear: year,
      model,
      language: localeLanguageName(locale),
    })
    setBusy(false)
    created.match({
      ok: (game) => {
        handleOpenChange(false)
        onCreated?.(game)
      },
      err: () => setError(t.newGame.createFailed),
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl" closeLabel={t.common.close}>
        <DialogHeader>
          <HugeiconsIcon icon={PlayIcon} strokeWidth={2} />
          <DialogTitle>
            {step === "country"
              ? t.newGame.countryStepTitle
              : t.newGame.setupStepTitle}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {step === "country"
            ? t.newGame.countryStepDescription
            : t.newGame.setupStepDescription(countryName)}
        </DialogDescription>

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
                  title={countryName}
                  className="h-4 w-auto rounded-[1px] ring-1 ring-black/15"
                />
                <span className="font-medium">{countryName}</span>
                <span className="text-xs text-muted-foreground">
                  {t.newGame.selectedLabel}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">{t.newGame.startYearLabel}</span>
              <input
                type="number"
                min={engine.minYear}
                max={engine.maxYear}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm tabular-nums focus:border-primary focus:outline-none"
              />
              <span className="text-xs text-muted-foreground">
                {t.newGame.startYearHint(engine.minYear, engine.maxYear)}
              </span>
            </label>

            <div className="grid gap-1.5 text-sm">
              <span className="font-medium">{t.newGame.modelLabel}</span>
              <ModelPicker
                selected={model}
                onSelect={setModel}
                preferFreeByDefault
              />
            </div>

            <div className="grid gap-2.5">
              {t.newGame.howItWorks.map((section) => (
                <div key={section.title}>
                  <div className="text-sm leading-tight font-medium">
                    {section.title}
                  </div>
                  <p className="text-xs leading-snug text-muted-foreground">
                    {section.body}
                  </p>
                </div>
              ))}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>{t.newGame.createFailedTitle}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "country" ? (
            <Button onClick={() => setStep("setup")} disabled={!country}>
              {t.newGame.next}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("country")}
                disabled={busy}
              >
                {t.newGame.back}
              </Button>
              <Button onClick={start} disabled={!country || !yearValid || busy}>
                {busy && <Spinner />}
                {busy ? t.newGame.starting : t.newGame.start}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
