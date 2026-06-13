import { GameController } from "@/components/game/game-controller"
import { HudShell } from "@/components/hud/hud-shell"
import { MapProvider } from "@/components/map/map-context"
import { WorldMap } from "@/components/map/world-map"

export default function Page() {
  return (
    <MapProvider>
      <main className="relative h-svh w-svw overflow-hidden">
        <WorldMap />
        <HudShell
          topLeft={
            <div className="flex items-center gap-2 select-none">
              <h1 className="flex h-8 items-center rounded-md border border-border bg-background/80 px-3 text-sm font-semibold tracking-[0.2em] text-foreground uppercase backdrop-blur-sm">
                Open Historia
              </h1>
              <GameController />
            </div>
          }
        />
      </main>
    </MapProvider>
  )
}
