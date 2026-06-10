"use client"

import { useEffect, useRef, useState } from "react"
import maplibregl from "maplibre-gl"
import { Protocol } from "pmtiles"
import "maplibre-gl/dist/maplibre-gl.css"

import { mapStyle } from "@/lib/map-style"

let protocolRegistered = false

function registerPmtilesProtocol() {
  if (protocolRegistered) return
  const protocol = new Protocol()
  maplibregl.addProtocol("pmtiles", protocol.tile)
  maplibregl.setMaxParallelImageRequests(32)
  protocolRegistered = true
}

/** Degrees of longitude the idle globe drifts per second. */
const IDLE_SPIN_SPEED = 1.5
/** Past this zoom the idle spin stops even without interaction. */
const IDLE_SPIN_MAX_ZOOM = 4
/** From this zoom on, hover targets regions instead of countries. */
const REGION_HOVER_MIN_ZOOM = 5

const PROJECTION_STORAGE_KEY = "openhistoria:projection"

type ProjectionMode = "globe" | "mercator"

type HoverTarget = {
  source: string
  sourceLayer: string
  id: string | number
}

export function WorldMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [projection, setProjection] = useState<ProjectionMode>("globe")
  const [hoverLabel, setHoverLabel] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    registerPmtilesProtocol()

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: [12, 30],
      zoom: 2.4,
      minZoom: 1,
      maxZoom: 18.5,
      maxPitch: 0,
      dragRotate: false,
      touchPitch: false,
      hash: true,
      // No label fade-in: symbols appear instantly while zooming.
      fadeDuration: 0,
      attributionControl: { compact: true },
    })
    mapRef.current = map

    // Defaults are tuned for cautious web maps; a strategy game wants to
    // cross many zoom levels in a couple of wheel flicks.
    map.scrollZoom.setWheelZoomRate(1 / 150)
    map.scrollZoom.setZoomRate(1 / 65)

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right",
    )

    // Idle spin: slow drift until the user interacts.
    let spinning = true
    const spin = () => {
      if (!spinning || map.getZoom() > IDLE_SPIN_MAX_ZOOM) return
      const center = map.getCenter()
      center.lng += IDLE_SPIN_SPEED
      map.easeTo({ center, duration: 1000, easing: (n) => n })
    }
    const stopSpinning = () => {
      spinning = false
      map.stop()
    }
    map.on("moveend", spin)
    map.on("mousedown", stopSpinning)
    map.on("touchstart", stopSpinning)
    map.on("wheel", stopSpinning)
    map.on("dblclick", stopSpinning)

    // Hover highlight: countries when zoomed out, regions when zoomed in.
    let hovered: HoverTarget | null = null
    const setHover = (target: HoverTarget | null, label: string | null) => {
      if (hovered) map.setFeatureState(hovered, { hover: false })
      if (target) map.setFeatureState(target, { hover: true })
      hovered = target
      setHoverLabel(label)
    }
    map.on("mousemove", (e) => {
      const useRegions = map.getZoom() >= REGION_HOVER_MIN_ZOOM
      const layer = useRegions ? "region-fill" : "country-fill"
      const feature = map.queryRenderedFeatures(e.point, {
        layers: [layer],
      })[0]
      if (!feature || feature.id === undefined) {
        setHover(null, null)
        return
      }
      if (hovered?.id === feature.id && hovered.source === feature.source) {
        return
      }
      const props = feature.properties ?? {}
      setHover(
        {
          source: feature.source,
          sourceLayer: useRegions ? "regions" : "countries",
          id: feature.id,
        },
        useRegions
          ? `${props.name as string}, ${props.country as string}`
          : ((props.name as string) ?? null),
      )
    })
    map.on("mouseout", () => setHover(null, null))

    map.on("load", () => {
      setLoaded(true)
      const stored = window.localStorage.getItem(PROJECTION_STORAGE_KEY)
      if (stored === "mercator") {
        map.setProjection({ type: "mercator" })
        setProjection("mercator")
      }
      spin()
    })

    return () => {
      mapRef.current = null
      map.remove()
    }
  }, [])

  const switchProjection = (mode: ProjectionMode) => {
    setProjection(mode)
    window.localStorage.setItem(PROJECTION_STORAGE_KEY, mode)
    mapRef.current?.setProjection({ type: mode })
  }

  return (
    <div className="relative h-full w-full bg-[#000005]">
      <div
        ref={containerRef}
        className={`h-full w-full transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
      <div className="absolute top-4 right-4 z-10 flex overflow-hidden rounded-md bg-black/60 text-xs font-medium text-white backdrop-blur-sm">
        {(
          [
            ["globe", "Globe"],
            ["mercator", "Flat"],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            aria-pressed={projection === mode}
            onClick={() => switchProjection(mode)}
            className={`cursor-pointer px-3 py-1.5 transition-colors ${
              projection === mode
                ? "bg-white/25 text-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {hoverLabel && (
        <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-sm font-medium tracking-wide text-white backdrop-blur-sm">
          {hoverLabel}
        </div>
      )}
    </div>
  )
}
