"use client"

import { useEffect, useRef } from "react"
import type { GeoJSONSource, MapMouseEvent } from "maplibre-gl"

import { compareGameDates, type EventKind, type GameDate, type GameEvent } from "@workspace/engine"

import { useGameSession } from "@/components/game/game-session"
import { useMapContext } from "@/components/map/map-context"

const SOURCE_ID = "game-events"
const POINTS_LAYER = "game-event-points"
const RING_LAYER = "game-event-rings"
const LABELS_LAYER = "game-event-labels"

/** Where an event sits relative to the current clock date. */
const eventStatus = (event: GameEvent, now: GameDate) => {
  if (compareGameDates(now, event.date) < 0) return "upcoming"
  if (event.endDate && compareGameDates(now, event.endDate) < 0) return "ongoing"
  return "done"
}

/** Marker color per event kind, matching the briefing feed accents. */
export const KIND_COLOR: Record<EventKind, string> = {
  political: "#38bdf8",
  military: "#f87171",
  economic: "#fbbf24",
  diplomatic: "#a78bfa",
  social: "#34d399",
  scientific: "#22d3ee",
  disaster: "#f97316",
}

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text

/**
 * Plots located game events on the shared maplibre map: a colored dot sized by
 * importance plus a short label. Clicking a dot opens the full event in a
 * menu-style panel (EventPanel). Renders nothing itself.
 */
export function EventMarkers() {
  const { map } = useMapContext()
  const { events, selectEvent, displayDate } = useGameSession()

  // Refs so the once-bound click handler always sees the latest data.
  const eventsRef = useRef(events)
  const selectRef = useRef(selectEvent)
  useEffect(() => {
    eventsRef.current = events
    selectRef.current = selectEvent
  }, [events, selectEvent])

  // Source + layers + interactions, set up once the map is available.
  useEffect(() => {
    if (!map) return

    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      })
    }
    if (!map.getLayer(POINTS_LAYER)) {
      map.addLayer({
        id: POINTS_LAYER,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "importance"],
            1,
            3,
            5,
            8,
          ],
          "circle-stroke-color": "#000000",
          "circle-stroke-opacity": 0.5,
          "circle-stroke-width": 1,
          // Upcoming events are faint; ongoing/done are solid.
          "circle-opacity": ["get", "opacity"],
        },
      })
    }
    if (!map.getLayer(RING_LAYER)) {
      // A hollow ring around events that are currently in progress.
      map.addLayer({
        id: RING_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["==", ["get", "status"], "ongoing"],
        paint: {
          "circle-color": "rgba(0,0,0,0)",
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "importance"],
            1,
            6,
            5,
            12,
          ],
          "circle-stroke-color": ["get", "color"],
          "circle-stroke-width": 1.5,
          "circle-stroke-opacity": 0.9,
        },
      })
    }
    if (!map.getLayer(LABELS_LAYER)) {
      map.addLayer({
        id: LABELS_LAYER,
        type: "symbol",
        source: SOURCE_ID,
        minzoom: 3,
        layout: {
          "text-field": ["get", "shortTitle"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
          "text-offset": [0, 1.1],
          "text-anchor": "top",
          "text-max-width": 9,
          "symbol-sort-key": ["-", 5, ["get", "importance"]],
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(0,0,0,0.85)",
          "text-halo-width": 1.3,
        },
      })
    }

    const onClick = (e: MapMouseEvent) => {
      const feature = map.queryRenderedFeatures(e.point, {
        layers: [POINTS_LAYER],
      })[0]
      const id = feature?.properties?.id
      if (!id) return
      const event = eventsRef.current.find((ev) => ev.id === id)
      if (event) selectRef.current(event, { x: e.point.x, y: e.point.y })
    }
    const onEnter = () => {
      map.getCanvas().style.cursor = "pointer"
    }
    const onLeave = () => {
      map.getCanvas().style.cursor = ""
    }
    map.on("click", POINTS_LAYER, onClick)
    map.on("mouseenter", POINTS_LAYER, onEnter)
    map.on("mouseleave", POINTS_LAYER, onLeave)

    return () => {
      try {
        map.off("click", POINTS_LAYER, onClick)
        map.off("mouseenter", POINTS_LAYER, onEnter)
        map.off("mouseleave", POINTS_LAYER, onLeave)
        if (map.getLayer(LABELS_LAYER)) map.removeLayer(LABELS_LAYER)
        if (map.getLayer(RING_LAYER)) map.removeLayer(RING_LAYER)
        if (map.getLayer(POINTS_LAYER)) map.removeLayer(POINTS_LAYER)
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
      } catch {
        // Style/map already gone; nothing to clean up.
      }
    }
  }, [map])

  // Push current events into the source whenever they change.
  useEffect(() => {
    if (!map) return
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined
    if (!source) return
    source.setData({
      type: "FeatureCollection",
      features: events
        .filter((event) => event.location)
        .map((event: GameEvent) => {
          const status = eventStatus(event, displayDate)
          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [event.location!.lng, event.location!.lat],
            },
            properties: {
              id: event.id,
              shortTitle: truncate(event.title, 22),
              importance: event.importance,
              color: KIND_COLOR[event.kind],
              status,
              opacity: status === "upcoming" ? 0.45 : 0.92,
            },
          }
        }),
    })
  }, [map, events, displayDate])

  return null
}
