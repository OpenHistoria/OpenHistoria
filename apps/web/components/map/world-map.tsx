"use client"

import { useEffect, useRef, useState } from "react"
import { Result } from "better-result"
import maplibregl from "maplibre-gl"
import { Protocol } from "pmtiles"
import "maplibre-gl/dist/maplibre-gl.css"

import { useI18n } from "@/hooks/use-i18n"
import { localizedCountryName } from "@/lib/country-names"
import type { Locale } from "@/lib/i18n"
import {
  cityLabelTextField,
  countryLabelTextField,
  mapStyle,
} from "@/lib/map-style"

let protocolRegistered = false

// City and country labels render localized text; region labels stay as the
// tiles ship them (GADM only provides English NAME_1 offline).
function applyMapLocale(map: maplibregl.Map, locale: Locale) {
  if (map.getLayer("city-labels"))
    map.setLayoutProperty("city-labels", "text-field", cityLabelTextField(locale))
  if (map.getLayer("country-labels"))
    map.setLayoutProperty(
      "country-labels",
      "text-field",
      countryLabelTextField(locale)
    )
}

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

// localStorage throws in Safari private mode and when storage is blocked;
// the projection preference is best-effort, so swallow those failures.
const readStoredProjection = () =>
  Result.try(() =>
    window.localStorage.getItem(PROJECTION_STORAGE_KEY)
  ).unwrapOr(null)

const storeProjection = (mode: ProjectionMode) =>
  Result.try(() => window.localStorage.setItem(PROJECTION_STORAGE_KEY, mode))

type ProjectionMode = "globe" | "mercator"

type HoverTarget = {
  source: string
  sourceLayer: string
  id: string | number
}

export function WorldMap() {
  const { t, locale } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  // The map is created once; the mousemove handler reads the live locale
  // through this ref to label country hovers without re-running the effect.
  const localeRef = useRef(locale)
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
      "bottom-right"
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
      // mousemove can fire before the style has loaded; querying a layer
      // that does not exist yet logs an error.
      if (!map.getLayer(layer)) return
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
          : localizedCountryName(
              props.iso_a2 as string | undefined,
              localeRef.current,
              (props.name as string) ?? null
            )
      )
    })
    map.on("mouseout", () => setHover(null, null))

    map.on("load", () => {
      setLoaded(true)
      applyMapLocale(map, localeRef.current)
      const stored = readStoredProjection()
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

  // Re-label city and country layers when the locale changes.
  useEffect(() => {
    localeRef.current = locale
    const map = mapRef.current
    if (map && loaded) applyMapLocale(map, locale)
  }, [locale, loaded])

  const switchProjection = (mode: ProjectionMode) => {
    setProjection(mode)
    storeProjection(mode)
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
            ["globe", t.map.globe],
            ["mercator", t.map.flat],
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
