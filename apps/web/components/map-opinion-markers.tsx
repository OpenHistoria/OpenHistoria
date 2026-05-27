"use client"

import { AI_NATIONS } from "@workspace/engine"
import { MapMarker, MapTooltip } from "@workspace/ui/components/map"

import { useGame } from "@/components/game-provider"

/**
 * Capital coordinates for each AI nation, used to place opinion markers on
 * the world map. Coordinates are city-center approximations — pretty enough
 * for a small marker, not load-bearing for any computation.
 */
const CAPITALS: Record<string, { lat: number; lng: number; label: string }> = {
  US: { lat: 38.9072, lng: -77.0369, label: "Washington" },
  GB: { lat: 51.5074, lng: -0.1278, label: "London" },
  DE: { lat: 52.52, lng: 13.405, label: "Berlin" },
  IT: { lat: 41.9028, lng: 12.4964, label: "Rome" },
  ES: { lat: 40.4168, lng: -3.7038, label: "Madrid" },
  RU: { lat: 55.7558, lng: 37.6173, label: "Moscow" },
  CN: { lat: 39.9042, lng: 116.4074, label: "Beijing" },
  JP: { lat: 35.6762, lng: 139.6503, label: "Tokyo" },
  BR: { lat: -15.8267, lng: -47.9218, label: "Brasília" },
  IN: { lat: 28.6139, lng: 77.209, label: "New Delhi" },
  AU: { lat: -35.2809, lng: 149.13, label: "Canberra" },
  CA: { lat: 45.4215, lng: -75.6972, label: "Ottawa" },
}

interface OpinionMarker {
  code: string
  name: string
  lat: number
  lng: number
  opinion: number
  allied: boolean
  capitalLabel: string
}

export function MapOpinionMarkers() {
  const game = useGame()
  if (!game) return null

  const markers: OpinionMarker[] = AI_NATIONS.flatMap((profile) => {
    const cap = CAPITALS[profile.code]
    if (!cap) return []
    const rel = game.relations[profile.code]
    return [
      {
        code: profile.code,
        name: profile.name,
        lat: cap.lat,
        lng: cap.lng,
        opinion: rel?.opinion ?? 0,
        allied: rel?.allied ?? false,
        capitalLabel: cap.label,
      },
    ]
  })

  return (
    <>
      {markers.map((m) => (
        <OpinionDot key={m.code} marker={m} />
      ))}
    </>
  )
}

function OpinionDot({ marker }: { marker: OpinionMarker }) {
  const color = opinionColor(marker.opinion)
  const ring = marker.allied
    ? "ring-2 ring-emerald-400"
    : "ring-1 ring-black/40"
  const size = marker.allied ? "size-3" : "size-2.5"
  return (
    <MapMarker position={[marker.lat, marker.lng]}>
      <MapTooltip>
        <div className="grid gap-0.5 text-xs">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium">{marker.name}</span>
            <span className="tabular-nums text-muted-foreground">
              {marker.opinion > 0 ? "+" : ""}
              {marker.opinion.toFixed(0)}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {marker.capitalLabel}
            {marker.allied ? " · allied" : ""}
          </span>
        </div>
      </MapTooltip>
      <div
        className={`pointer-events-auto cursor-default rounded-full shadow-md ${size} ${ring}`}
        style={{ backgroundColor: color }}
      />
    </MapMarker>
  )
}

function opinionColor(opinion: number): string {
  // -100..+100 → red → amber → emerald
  const clamped = Math.max(-100, Math.min(100, opinion))
  if (clamped >= 0) {
    // 0..100 amber (#f59e0b) → emerald (#10b981)
    const t = clamped / 100
    return interpolate("#f59e0b", "#10b981", t)
  }
  // -100..0 red (#dc2626) → amber (#f59e0b)
  const t = (clamped + 100) / 100
  return interpolate("#dc2626", "#f59e0b", t)
}

function interpolate(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA)
  const b = hexToRgb(hexB)
  const r = Math.round(a.r + (b.r - a.r) * t)
  const g = Math.round(a.g + (b.g - a.g) * t)
  const bl = Math.round(a.b + (b.b - a.b) * t)
  return `rgb(${r}, ${g}, ${bl})`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const v = hex.replace("#", "")
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  }
}
