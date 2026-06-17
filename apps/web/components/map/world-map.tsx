"use client"

import { useEffect, useRef, useState } from "react"
import { Result } from "better-result"
import maplibregl from "maplibre-gl"
import { Protocol } from "pmtiles"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  GlobalIcon,
  MapsSquare01Icon,
  MinusSignIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"
import "maplibre-gl/dist/maplibre-gl.css"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

import { useMapContext } from "@/components/map/map-context"
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
    map.setLayoutProperty(
      "city-labels",
      "text-field",
      cityLabelTextField(locale)
    )
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
const MAP_INITIAL_ZOOM = 2.4
const MAP_MIN_ZOOM = 1
const MAP_MAX_ZOOM = 18.5

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
  const { setMap } = useMapContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const stopSpinRef = useRef<() => void>(() => {})
  // The map is created once; the mousemove handler reads the live locale
  // through this ref to label country hovers without re-running the effect.
  const localeRef = useRef(locale)
  const [loaded, setLoaded] = useState(false)
  const [projection, setProjection] = useState<ProjectionMode>("globe")
  const [zoom, setZoom] = useState(MAP_INITIAL_ZOOM)
  const [hoverLabel, setHoverLabel] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    registerPmtilesProtocol()

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: [12, 30],
      zoom: MAP_INITIAL_ZOOM,
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      maxPitch: 0,
      dragRotate: false,
      touchPitch: false,
      hash: true,
      // No label fade-in: symbols appear instantly while zooming.
      fadeDuration: 0,
      // No attribution/imagery-source control.
      attributionControl: false,
    })
    mapRef.current = map

    // Defaults are tuned for cautious web maps; a strategy game wants to
    // cross many zoom levels in a couple of wheel flicks.
    map.scrollZoom.setWheelZoomRate(1 / 150)
    map.scrollZoom.setZoomRate(1 / 65)

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
    stopSpinRef.current = stopSpinning
    map.on("moveend", spin)
    map.on("mousedown", stopSpinning)
    map.on("touchstart", stopSpinning)
    map.on("wheel", stopSpinning)
    map.on("dblclick", stopSpinning)
    map.on("zoom", () => setZoom(map.getZoom()))

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
      setMap(map)
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
      stopSpinRef.current = () => {}
      setMap(null)
      map.remove()
    }
  }, [setMap])

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

  const zoomBy = (delta: number) => {
    const map = mapRef.current
    if (!map) return
    stopSpinRef.current()
    map.easeTo({
      zoom: Math.max(
        MAP_MIN_ZOOM,
        Math.min(MAP_MAX_ZOOM, map.getZoom() + delta)
      ),
      duration: 180,
    })
  }

  return (
    <div className="relative h-full w-full bg-[#000005]">
      <div
        ref={containerRef}
        className={`h-full w-full transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
      <div className="absolute top-2.5 right-2.5 z-10 flex overflow-hidden rounded-md border border-border bg-background/80 text-xs font-medium text-foreground backdrop-blur-sm">
        {(
          [
            ["globe", t.map.globe, GlobalIcon],
            ["mercator", t.map.flat, MapsSquare01Icon],
          ] as const
        ).map(([mode, label, icon]) => (
          <button
            key={mode}
            type="button"
            aria-pressed={projection === mode}
            onClick={() => switchProjection(mode)}
            title={label}
            className={`flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 transition-colors ${
              projection === mode
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5" />
            {label}
          </button>
        ))}
      </div>
      <div className="absolute top-12 right-2.5 z-10 flex flex-col overflow-hidden rounded-md border border-border bg-background/80 text-foreground backdrop-blur-sm">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label={t.map.zoomIn}
                disabled={zoom >= MAP_MAX_ZOOM}
                onClick={() => zoomBy(1)}
                className="flex size-[30px] items-center justify-center transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-default disabled:opacity-40"
              />
            }
          >
            <HugeiconsIcon
              icon={PlusSignIcon}
              strokeWidth={2}
              className="size-4"
            />
          </TooltipTrigger>
          <TooltipContent side="left">{t.map.zoomIn}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label={t.map.zoomOut}
                disabled={zoom <= MAP_MIN_ZOOM}
                onClick={() => zoomBy(-1)}
                className="flex size-[30px] items-center justify-center border-t border-border transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-default disabled:opacity-40"
              />
            }
          >
            <HugeiconsIcon
              icon={MinusSignIcon}
              strokeWidth={2}
              className="size-4"
            />
          </TooltipTrigger>
          <TooltipContent side="left">{t.map.zoomOut}</TooltipContent>
        </Tooltip>
      </div>
      {hoverLabel && (
        <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full border border-border bg-background/80 px-4 py-1.5 text-sm font-medium tracking-wide text-foreground backdrop-blur-sm">
          {hoverLabel}
        </div>
      )}
    </div>
  )
}
