"use client"

import { useState } from "react"

import type { CountryListEntry, Game } from "@workspace/engine"
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
import { useI18n } from "@/hooks/use-i18n"
import { engine } from "@/lib/engine"

interface NewGameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (game: Game) => void
}

/**
 * New-game flow: pick any country in the world and a start year, then hand
 * both to the engine. The picker UI follows the original Open Historia
 * archive: searchable flag-annotated list plus a selected-country row.
 */
export function NewGameDialog({
  open,
  onOpenChange,
  onCreated,
}: NewGameDialogProps) {
  const { t } = useI18n()
  const [country, setCountry] = useState<CountryListEntry | null>(null)
  const [year, setYear] = useState(engine.maxYear)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const yearValid = year >= engine.minYear && year <= engine.maxYear

  const start = async () => {
    if (!country || !yearValid || busy) return
    setBusy(true)
    setError(null)
    const created = await engine.createGame({
      countryCode: country.code,
      countryName: country.name,
      startYear: year,
    })
    setBusy(false)
    created.match({
      ok: (game) => {
        onOpenChange(false)
        onCreated?.(game)
      },
      err: () => setError(t.newGame.createFailed),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t.newGame.title}</DialogTitle>
          <DialogDescription>{t.newGame.description}</DialogDescription>
        </DialogHeader>

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
                {t.newGame.selectedLabel}
              </span>
            </div>
          )}

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

          {error && (
            <Alert variant="destructive">
              <AlertTitle>{t.newGame.createFailedTitle}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {t.newGame.cancel}
          </Button>
          <Button onClick={start} disabled={!country || !yearValid || busy}>
            {busy && <Spinner />}
            {busy ? t.newGame.starting : t.newGame.start}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
