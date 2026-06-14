"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Menu01Icon,
  News01Icon,
  Settings01Icon,
  UserShield01Icon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"

import type { Game } from "@workspace/engine"

import { AdvisorPanel } from "@/components/game/advisor-panel"
import { BriefingPanel } from "@/components/game/briefing-panel"
import { DecisionPanel } from "@/components/game/decision-panel"
import { DirectivesPanel } from "@/components/game/directives-panel"
import { EventMarkers } from "@/components/game/event-markers"
import { EventPanel } from "@/components/game/event-panel"
import { EventReport } from "@/components/game/event-report"
import { GameSessionProvider } from "@/components/game/game-session"
import { JumpControls } from "@/components/game/jump-controls"
import { PauseMenu } from "@/components/game/pause-menu"
import { SettingsMenu } from "@/components/settings/settings-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

import { NewGameHudButton } from "@/components/new-game/new-game-hud-button"
import { useI18n } from "@/hooks/use-i18n"
import { engine } from "@/lib/engine"

/**
 * Owns the active game and the game HUD: the new-game button, the briefing and
 * pause-menu toggles, and the floating/docked panels they control. On load the
 * most recently active game is resumed so a refresh keeps the playthrough.
 */
export function GameController() {
  const { t } = useI18n()
  const [game, setGame] = useState<Game | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [briefingOpen, setBriefingOpen] = useState(true)
  const [briefingPos, setBriefingPos] = useState({ x: 16, y: 96 })
  const [directivesOpen, setDirectivesOpen] = useState(false)
  const [directivesPos, setDirectivesPos] = useState({ x: 24, y: 120 })
  const [conseillerOpen, setConseillerOpen] = useState(false)
  const [conseillerPos, setConseillerPos] = useState({ x: 24, y: 120 })

  useEffect(() => {
    let active = true
    void (async () => {
      const games = await engine.listGames()
      if (!active || games.isErr()) return
      const latest = games.value
        .filter((g) => g.status === "active")
        .sort((a, b) => b.updatedAt - a.updatedAt)[0]
      if (latest) setGame(latest)
    })()
    return () => {
      active = false
    }
  }, [])

  // Esc opens the pause menu in a game, or the settings menu on the bare map,
  // but only when no dialog is already open (so it does not fire while the
  // new-game dialog or a menu itself handles Esc).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (document.querySelector('[role="dialog"][data-state="open"]')) return
      if (game) setMenuOpen(true)
      else setSettingsOpen(true)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [game])

  const startGame = (next: Game) => {
    setGame(next)
    setBriefingOpen(true)
  }

  // Open a center-screen panel of the given width; toggle closed otherwise.
  const toggleCentered = (
    open: boolean,
    setOpen: (fn: (v: boolean) => boolean) => void,
    setPos: (pos: { x: number; y: number }) => void,
    width: number
  ) => {
    if (!open) {
      setPos({
        x: Math.max(8, Math.round((window.innerWidth - width) / 2)),
        y: Math.max(8, Math.round(window.innerHeight / 2 - 240)),
      })
    }
    setOpen((v) => !v)
  }

  const toggleDirectives = () =>
    toggleCentered(directivesOpen, setDirectivesOpen, setDirectivesPos, 460)
  const toggleConseiller = () =>
    toggleCentered(conseillerOpen, setConseillerOpen, setConseillerPos, 420)

  return (
    <>
      <div className="flex items-center gap-2">
        <NewGameHudButton onCreated={startGame} />
        {game ? (
          <>
            <HudIconButton
              icon={News01Icon}
              label={t.game.briefingTitle}
              active={briefingOpen}
              onClick={() => setBriefingOpen((v) => !v)}
            />
            <HudIconButton
              icon={Menu01Icon}
              label={t.menu.open}
              onClick={() => setMenuOpen(true)}
            />
          </>
        ) : (
          <HudIconButton
            icon={Settings01Icon}
            label={t.menu.settings}
            onClick={() => setSettingsOpen(true)}
          />
        )}
      </div>

      <SettingsMenu
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {game && (
        <GameSessionProvider key={game.id} game={game} onGameChange={setGame}>
          <EventMarkers />
          <EventPanel />
          <DecisionPanel />
          <EventReport />

          {/* Jump deck: bottom-left (shows the played country's flag). */}
          <div className="fixed bottom-4 left-4 z-[1100]">
            <JumpControls />
          </div>

          {/* Launchers, bottom-right: consult the advisor, and directives. */}
          <div className="fixed right-4 bottom-4 z-[1100] flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={toggleConseiller}
                    aria-label={t.game.conseiller.title}
                    aria-pressed={conseillerOpen}
                    className="flex size-12 cursor-pointer items-center justify-center rounded-full border border-border bg-background/70 text-foreground backdrop-blur-sm transition-transform hover:scale-105 active:translate-y-px"
                  />
                }
              >
                <HugeiconsIcon
                  icon={UserShield01Icon}
                  strokeWidth={2}
                  className="size-5"
                />
              </TooltipTrigger>
              <TooltipContent side="top">{t.game.conseiller.title}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={toggleDirectives}
                    aria-label={t.game.directivesTitle}
                    aria-pressed={directivesOpen}
                    className="size-14 cursor-pointer rounded-full border border-border bg-background/70 p-1.5 backdrop-blur-sm transition-transform hover:scale-105 active:translate-y-px"
                  />
                }
              >
                <Image
                  src="/icons/directives.png"
                  alt=""
                  width={200}
                  height={200}
                  className="size-full object-contain drop-shadow-md"
                />
              </TooltipTrigger>
              <TooltipContent side="top">{t.game.directivesTitle}</TooltipContent>
            </Tooltip>
          </div>

          <DirectivesPanel
            open={directivesOpen}
            onClose={() => setDirectivesOpen(false)}
            position={directivesPos}
            onPositionChange={setDirectivesPos}
          />
          <AdvisorPanel
            open={conseillerOpen}
            onClose={() => setConseillerOpen(false)}
            position={conseillerPos}
            onPositionChange={setConseillerPos}
          />
          <BriefingPanel
            open={briefingOpen}
            onClose={() => setBriefingOpen(false)}
            position={briefingPos}
            onPositionChange={setBriefingPos}
          />
          <PauseMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            onExit={() => {
              setGame(null)
              setMenuOpen(false)
            }}
            onToggleBriefing={() => setBriefingOpen((v) => !v)}
            onImported={startGame}
          />
        </GameSessionProvider>
      )}
    </>
  )
}

function HudIconButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: IconSvgElement
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            aria-label={label}
            aria-pressed={active}
            className={`flex h-8 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm font-medium backdrop-blur-sm transition-colors ${
              active
                ? "bg-accent text-accent-foreground"
                : "bg-background/80 text-foreground hover:bg-accent"
            }`}
          />
        }
      >
        <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
