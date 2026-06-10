import { WorldMap } from "@/components/map/world-map"

export default function Page() {
  return (
    <main className="h-svh w-svw overflow-hidden">
      <WorldMap />
      <div className="pointer-events-none absolute top-4 left-4 z-10 select-none">
        <h1 className="rounded-md bg-black/60 px-3 py-1.5 text-sm font-semibold tracking-[0.2em] text-white uppercase backdrop-blur-sm">
          Open Historia
        </h1>
      </div>
    </main>
  )
}
