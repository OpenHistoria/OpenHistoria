"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowReloadHorizontalIcon,
  Search01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"

import { DEFAULT_MODEL, ROTATE_FREE_MODELS } from "@workspace/engine"
import { cn } from "@workspace/ui/lib/utils"

import { useI18n } from "@/hooks/use-i18n"
import { useOpenRouterModels } from "@/hooks/use-openrouter-models"
import { pickBestFreeModel } from "@/lib/openrouter-models"

/** Searchable OpenRouter model list for the new-game flow and settings. */
export function ModelPicker({
  selected,
  onSelect,
  preferFreeByDefault = false,
}: {
  selected: string
  onSelect: (modelId: string) => void
  /** Auto-select the best free model once the catalog loads (new games). */
  preferFreeByDefault?: boolean
}) {
  const { t } = useI18n()
  const { models, loading, error } = useOpenRouterModels()
  const [query, setQuery] = useState("")

  const bestFree = useMemo(() => pickBestFreeModel(models), [models])

  // Default new games to rotating free models so play is free and resilient.
  const autoSelected = useRef(false)
  useEffect(() => {
    if (autoSelected.current || !preferFreeByDefault || !bestFree) return
    autoSelected.current = true
    if (selected === DEFAULT_MODEL) onSelect(ROTATE_FREE_MODELS)
  }, [preferFreeByDefault, bestFree, selected, onSelect])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return models
    return models.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
    )
  }, [query, models])

  if (error) {
    return (
      <p className="rounded-md border border-border/60 px-3 py-2 text-sm text-muted-foreground">
        {t.newGame.modelLoadError}
      </p>
    )
  }

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
          placeholder={t.newGame.modelSearchPlaceholder}
          className="w-full rounded-md border border-border bg-background py-1.5 pr-2 pl-8 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>
      {bestFree && (
        <button
          type="button"
          onClick={() => onSelect(ROTATE_FREE_MODELS)}
          aria-pressed={selected === ROTATE_FREE_MODELS}
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors",
            selected === ROTATE_FREE_MODELS
              ? "border-primary bg-primary/10"
              : "border-border/60 hover:bg-muted/60"
          )}
        >
          <HugeiconsIcon
            icon={ArrowReloadHorizontalIcon}
            strokeWidth={2}
            className="size-4 text-primary"
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{t.newGame.modelRotateFree}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {t.newGame.modelRotateFreeHint}
            </div>
          </div>
        </button>
      )}
      {bestFree && (
        <button
          type="button"
          onClick={() => onSelect(bestFree.id)}
          aria-pressed={selected === bestFree.id}
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors",
            selected === bestFree.id
              ? "border-primary bg-primary/10"
              : "border-border/60 hover:bg-muted/60"
          )}
        >
          <HugeiconsIcon
            icon={SparklesIcon}
            strokeWidth={2}
            className="size-4 text-primary"
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{t.newGame.modelBestFree}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {bestFree.name} · {t.newGame.modelFree}
            </div>
          </div>
        </button>
      )}
      <div className="max-h-52 overflow-y-auto rounded-md border border-border/60">
        {loading ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {t.newGame.modelLoading}
          </p>
        ) : results.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {t.newGame.modelNoMatch(query)}
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {results.map((m) => {
              const isSelected = selected === m.id
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(m.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-3 py-1.5 text-left transition-colors",
                      isSelected ? "bg-primary/15" : "hover:bg-muted/60"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex-1 truncate text-sm",
                          isSelected && "font-medium text-primary"
                        )}
                      >
                        {m.name}
                      </span>
                      {m.id === DEFAULT_MODEL && (
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-muted-foreground uppercase">
                          {t.newGame.modelDefaultBadge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {m.free
                        ? t.newGame.modelFree
                        : t.newGame.modelPrice(
                            m.promptPricePerM,
                            m.completionPricePerM
                          )}
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
