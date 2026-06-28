"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  FileSearchIcon,
  Logout01Icon,
} from "@hugeicons/core-free-icons"

import {
  DIFFICULTY_LABELS,
  SETTING_LABELS,
  type Case,
} from "@workspace/detective-engine"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

import { CaseHud } from "@/games/casefile/components/case/case-hud"
import {
  CaseSessionProvider,
  useCaseSession,
} from "@/games/casefile/components/case/case-session"
import { InvestigationView } from "@/games/casefile/components/case/investigation-view"

export function CaseScreen({
  theCase,
  onCaseChange,
  onExit,
  onNewCase,
}: {
  theCase: Case
  onCaseChange: (theCase: Case) => void
  onExit: () => void
  onNewCase: () => void
}) {
  return (
    <CaseSessionProvider
      key={theCase.id}
      theCase={theCase}
      onCaseChange={onCaseChange}
    >
      <CaseLayout onExit={onExit} onNewCase={onNewCase} />
    </CaseSessionProvider>
  )
}

function CaseLayout({
  onExit,
  onNewCase,
}: {
  onExit: () => void
  onNewCase: () => void
}) {
  const { theCase } = useCaseSession()
  const [hudOpen, setHudOpen] = useState(false)

  return (
    <main className="flex h-svh w-svw flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate font-heading text-sm font-semibold tracking-wide text-foreground">
            {theCase.title}
          </h1>
        </div>
        <Badge variant="outline" className="shrink-0">
          {SETTING_LABELS[theCase.setting]}
        </Badge>
        <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
          {DIFFICULTY_LABELS[theCase.difficulty]}
        </Badge>
        <div className="ms-auto flex items-center gap-1.5">
          <HeaderButton
            icon={FileSearchIcon}
            label="Case file"
            className="lg:hidden"
            onClick={() => setHudOpen((v) => !v)}
          />
          <HeaderButton
            icon={Logout01Icon}
            label="Leave case"
            onClick={onExit}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="min-w-0 flex-1">
          <InvestigationView onNewCase={onNewCase} />
        </section>

        <aside className="hidden w-80 shrink-0 overflow-y-auto border-s border-border bg-card/40 p-5 lg:block">
          <CaseHud />
        </aside>
      </div>

      {/* Mobile case-file drawer. */}
      {hudOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setHudOpen(false)}
        >
          <div
            className="absolute end-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto border-s border-border bg-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-sm font-semibold text-foreground">
                Case file
              </h2>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setHudOpen(false)}
                aria-label="Close"
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </Button>
            </div>
            <CaseHud />
          </div>
        </div>
      )}
    </main>
  )
}

function HeaderButton({
  icon,
  label,
  className,
  onClick,
}: {
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"]
  label: string
  className?: string
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onClick}
            aria-label={label}
            className={className}
          />
        }
      >
        <HugeiconsIcon icon={icon} strokeWidth={2} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
