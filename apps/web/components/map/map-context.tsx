"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type maplibregl from "maplibre-gl"

/**
 * Shares the maplibre map instance from WorldMap with sibling components (the
 * game HUD) that need to draw on it - notably event markers, which live in the
 * game session tree, not inside WorldMap.
 */
interface MapContextValue {
  map: maplibregl.Map | null
  setMap: (map: maplibregl.Map | null) => void
}

const MapContext = createContext<MapContextValue | null>(null)

export function MapProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<maplibregl.Map | null>(null)
  return (
    <MapContext.Provider value={{ map, setMap }}>
      {children}
    </MapContext.Provider>
  )
}

export function useMapContext(): MapContextValue {
  const value = useContext(MapContext)
  if (!value) {
    throw new Error("useMapContext must be used within a MapProvider")
  }
  return value
}
