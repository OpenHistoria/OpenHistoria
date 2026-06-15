"use client"

import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon } from "@hugeicons/core-free-icons"

import { WORLD_COUNTRIES, type CountryListEntry } from "@workspace/engine"
import { cn } from "@workspace/ui/lib/utils"

import { CountryFlag } from "@/components/country-flag"
import { useI18n } from "@/hooks/use-i18n"
import { localizedCountryName } from "@/lib/country-names"

/** Searchable, flag-annotated country list for the new-game flow. */
export function CountryPicker({
  selected,
  onSelect,
}: {
  selected: string | null
  onSelect: (entry: CountryListEntry) => void
}) {
  const { t, locale } = useI18n()
  const [query, setQuery] = useState("")

  // Display and sort by the localized name; the entry passed to onSelect keeps
  // the canonical English roster name the engine stores.
  const entries = useMemo(
    () =>
      WORLD_COUNTRIES.map((c) => ({
        ...c,
        label: localizedCountryName(c.code, locale, c.name),
      })).sort((a, b) => a.label.localeCompare(b.label, locale)),
    [locale]
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase() === q
    )
  }, [query, entries])

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <HugeiconsIcon
          icon={Search01Icon}
          strokeWidth={2}
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.newGame.searchPlaceholder}
          autoFocus
          className="w-full rounded-md border border-border bg-background py-1.5 pr-2 pl-8 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-md border border-border/60">
        {results.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {t.newGame.noMatch(query)}
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {results.map((c) => {
              const isSelected = selected === c.code
              return (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => onSelect({ code: c.code, name: c.name })}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors",
                      isSelected
                        ? "bg-primary/15 text-primary"
                        : "hover:bg-muted/60"
                    )}
                  >
                    <CountryFlag
                      code={c.code}
                      title={c.label}
                      className="h-3.5 w-auto rounded-[1px] ring-1 ring-black/15"
                    />
                    <span className="flex-1 truncate">{c.label}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {c.code}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
