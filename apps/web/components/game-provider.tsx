"use client"

import {
  Game,
  SPEED_MS_PER_DAY,
  loadGame,
  saveGame,
  type GameSpeed,
  type Project,
} from "@workspace/engine"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

interface GameActions {
  setSpeed: (speed: GameSpeed) => void
  togglePause: () => void
  addProject: (project: Project) => void
  removeProject: (id: string) => void
}

interface GameContextValue {
  game: Game | null
  actions: GameActions
}

const noopActions: GameActions = {
  setSpeed: () => {},
  togglePause: () => {},
  addProject: () => {},
  removeProject: () => {},
}

const GameContext = createContext<GameContextValue>({
  game: null,
  actions: noopActions,
})

export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<Game | null>(null)

  useEffect(() => {
    const existing = loadGame()
    if (existing) {
      setGame(existing)
      return
    }
    const next = Game.createNew()
    saveGame(next)
    setGame(next)
  }, [])

  const setSpeed = useCallback((speed: GameSpeed) => {
    setGame((current) => {
      if (!current) return current
      const next = current.with({ speed })
      saveGame(next)
      return next
    })
  }, [])

  const togglePause = useCallback(() => {
    setGame((current) => {
      if (!current) return current
      const next = current.with({ paused: !current.paused })
      saveGame(next)
      return next
    })
  }, [])

  const addProject = useCallback((project: Project) => {
    setGame((current) => {
      if (!current) return current
      const next = current.addProject(project)
      saveGame(next)
      return next
    })
  }, [])

  const removeProject = useCallback((id: string) => {
    setGame((current) => {
      if (!current) return current
      const next = current.removeProject(id)
      saveGame(next)
      return next
    })
  }, [])

  useEffect(() => {
    if (!game || game.paused) return
    const intervalMs = SPEED_MS_PER_DAY[game.speed]
    const id = setInterval(() => {
      setGame((current) => {
        if (!current || current.paused) return current
        const next = current.advanceDays(1)
        saveGame(next)
        return next
      })
    }, intervalMs)
    return () => clearInterval(id)
  }, [game?.speed, game?.paused, game])

  const value = useMemo<GameContextValue>(
    () => ({
      game,
      actions: { setSpeed, togglePause, addProject, removeProject },
    }),
    [game, setSpeed, togglePause, addProject, removeProject]
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame(): Game | null {
  return useContext(GameContext).game
}

export function useGameActions(): GameActions {
  return useContext(GameContext).actions
}
