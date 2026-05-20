"use client"

import { MapMarker } from "@workspace/ui/components/map"
import type { Feature, FeatureCollection, Point } from "geojson"
import { useEffect, useState } from "react"
import { useMap, useMapEvents } from "react-leaflet"

import { useMapSelection } from "@/components/map-country-regions"

interface CityProperties {
  NAME?: string
  NAME_EN?: string
  ADM0NAME?: string
  SCALERANK?: number
  POP_MAX?: number
  ADM0CAP?: number
  MEGACITY?: number
  WORLDCITY?: number
}

type CityFeature = Feature<Point, CityProperties>

// Cities have SCALERANK 0–10. 0 = global megacity (Tokyo, NYC), 10 = village.
// Show progressively more cities as the user zooms in.
function maxScaleRankForZoom(zoom: number): number {
  if (zoom <= 3) return 1 // ~30 megacities
  if (zoom <= 4) return 3
  if (zoom <= 5) return 5
  if (zoom <= 6) return 7
  if (zoom <= 7) return 9
  return 10
}

function fontSizeForZoom(zoom: number): number {
  if (zoom <= 4) return 10
  if (zoom <= 6) return 11
  return 12
}

export function MapCities() {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())
  const [data, setData] = useState<FeatureCollection<
    Point,
    CityProperties
  > | null>(null)
  const { selected, setSelected } = useMapSelection()

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  })

  useEffect(() => {
    let cancelled = false
    fetch("/data/cities-50m.geojson")
      .then((r) => r.json())
      .then((json: FeatureCollection<Point, CityProperties>) => {
        if (!cancelled) setData(json)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!data) return null

  const maxRank = maxScaleRankForZoom(zoom)
  const fontSize = fontSizeForZoom(zoom)
  const visible = data.features.filter((f) => {
    const r = f.properties?.SCALERANK ?? 99
    return r <= maxRank
  })

  return (
    <>
      {visible.map((feature) => {
        const props = feature.properties ?? {}
        const name = props.NAME_EN ?? props.NAME ?? "Unknown"
        const country = props.ADM0NAME ?? "Unknown"
        const pop = props.POP_MAX
        const isCapital = props.ADM0CAP === 1
        const coords = feature.geometry.coordinates as [number, number]
        const position: [number, number] = [coords[1], coords[0]]
        const isSelected =
          selected?.type === "city" &&
          selected.name === name &&
          selected.country === country
        const dotSize = isCapital ? 5 : 4

        return (
          <MapMarker
            key={`${country}/${name}/${coords[0]},${coords[1]}`}
            position={position}
            iconAnchor={[0, 0]}
            eventHandlers={{
              click: () =>
                setSelected({
                  type: "city",
                  name,
                  country,
                  population: pop,
                }),
            }}
            icon={
              <div
                className="cursor-pointer transition-transform hover:scale-110"
                style={{
                  transform: "translate(-50%, -50%)",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: `${dotSize}px`,
                    height: `${dotSize}px`,
                    borderRadius: "50%",
                    background: isSelected
                      ? "oklch(0.95 0.12 85)"
                      : isCapital
                        ? "oklch(0.85 0.13 80)"
                        : "oklch(0.92 0.05 85)",
                    boxShadow: isCapital
                      ? "0 0 0 1.5px rgba(0,0,0,0.6), 0 0 6px rgba(232,207,156,0.6)"
                      : "0 0 0 1px rgba(0,0,0,0.7)",
                  }}
                />
                <span
                  className="whitespace-nowrap font-sans"
                  style={{
                    fontSize: `${fontSize}px`,
                    fontWeight: isCapital ? 600 : 500,
                    color: isSelected
                      ? "oklch(0.97 0.06 85)"
                      : isCapital
                        ? "oklch(0.94 0.05 85)"
                        : "oklch(0.92 0.02 85)",
                    textShadow:
                      "0 0 2px rgba(0,0,0,0.95), 0 1px 2px rgba(0,0,0,0.9)",
                    letterSpacing: isCapital ? "0.03em" : "0",
                  }}
                >
                  {name}
                </span>
              </div>
            }
          />
        )
      })}
    </>
  )
}
