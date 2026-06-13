import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl"

import { countryNameOrNull } from "@/lib/country-names"
import type { Locale } from "@/lib/i18n"

/**
 * Every ISO 3166-1 alpha-2 code ICU recognizes, found by probing all 676
 * two-letter combinations once. This spans dependencies and island
 * territories (Wallis-et-Futuna, Îles Turques-et-Caïques, ...) that sit
 * outside the sovereign-state roster, so their map labels still localize.
 */
const ALPHA2_CODES: readonly string[] = (() => {
  const codes: string[] = []
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      codes.push(String.fromCharCode(a, b))
    }
  }
  return codes
})()

/**
 * City label text for a locale: prefer the locale's name, then English, then
 * the tile's default `name`. Localized city names live in world.pmtiles only
 * after it is rebuilt from the full Natural Earth places dataset
 * (`bun run build:map-data --world --force`); until then the coalesce simply
 * falls back to `name`, so nothing breaks.
 */
export function cityLabelTextField(locale: Locale): ExpressionSpecification {
  if (locale === "en") return ["coalesce", ["get", "name_en"], ["get", "name"]]
  return [
    "coalesce",
    ["get", `name_${locale}`],
    ["get", "name_en"],
    ["get", "name"],
  ]
}

/**
 * Country label text for a locale: an ISO code → localized name match built
 * from Intl.DisplayNames, so map labels stay consistent with the country
 * picker without baking names into the tiles. Codes outside the roster
 * (territories, disputed areas) fall back to the tile's `name`.
 */
export function countryLabelTextField(locale: Locale): ExpressionSpecification {
  const cases: string[] = []
  for (const code of ALPHA2_CODES) {
    const name = countryNameOrNull(code, locale)
    if (name) cases.push(code, name)
  }
  return [
    "match",
    ["get", "iso_a2"],
    ...cases,
    ["get", "name"],
  ] as unknown as ExpressionSpecification
}

/**
 * Satellite hybrid style, Google Maps-like.
 *
 * - Imagery: Esri World Imagery raster tiles (free with attribution, up to z19).
 * - Borders, country labels and city labels: local PMTiles built from
 *   Natural Earth 10m data (see public/map/world.pmtiles).
 * - Globe projection at low zoom, transitions to mercator as you zoom in.
 */
const baseStyle: StyleSpecification = {
  version: 8,
  projection: { type: "globe" },
  sky: {
    "sky-color": "#000005",
    "fog-color": "#000005",
    "horizon-color": "#1d4a8f",
    "atmosphere-blend": [
      "interpolate",
      ["linear"],
      ["zoom"],
      0,
      1,
      5,
      1,
      6.5,
      0,
    ],
  },
  glyphs:
    "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
  sources: {
    satellite: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        "Imagery © Esri, Maxar, Earthstar Geographics | Boundaries: Natural Earth",
    },
    world: {
      type: "vector",
      url: "pmtiles:///map/world.pmtiles",
      promoteId: { countries: "name" },
    },
    // First-level subdivisions (states/regions) from GADM 4.1.
    // Not committed to git (GADM forbids redistribution): generate with
    // `bun run build:map-data`.
    regions: {
      type: "vector",
      url: "pmtiles:///map/regions.pmtiles",
      promoteId: { regions: "gid" },
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#000005" },
    },
    {
      id: "satellite",
      type: "raster",
      source: "satellite",
      paint: {
        // No cross-fade between zoom levels: tiles snap in immediately,
        // which reads as faster zooming.
        "raster-fade-duration": 0,
      },
    },
    {
      // Invisible fill used for hover feature-state and pointer queries.
      id: "country-fill",
      type: "fill",
      source: "world",
      "source-layer": "countries",
      paint: {
        "fill-color": "#ffffff",
        "fill-opacity": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.1,
          0,
        ],
      },
    },
    {
      // Invisible fill used for region hover feature-state and pointer queries.
      id: "region-fill",
      type: "fill",
      source: "regions",
      "source-layer": "regions",
      minzoom: 5,
      paint: {
        "fill-color": "#ffffff",
        "fill-opacity": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.1,
          0,
        ],
      },
    },
    {
      id: "region-boundary",
      type: "line",
      source: "regions",
      "source-layer": "regions",
      minzoom: 5,
      layout: { "line-join": "round" },
      paint: {
        "line-color": "#ffffff",
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0.2, 8, 0.4],
        "line-width": [
          "interpolate",
          ["exponential", 1.4],
          ["zoom"],
          5,
          0.4,
          10,
          1,
        ],
      },
    },
    {
      id: "boundary-casing",
      type: "line",
      source: "world",
      "source-layer": "boundaries",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#000000",
        "line-opacity": 0.3,
        "line-width": [
          "interpolate",
          ["exponential", 1.4],
          ["zoom"],
          0,
          1.6,
          5,
          2.4,
          10,
          4,
        ],
      },
    },
    {
      id: "boundary",
      type: "line",
      source: "world",
      "source-layer": "boundaries",
      filter: ["!", ["in", "Disputed", ["get", "FEATURECLA"]]],
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#ffffff",
        "line-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          0.45,
          4,
          0.65,
          8,
          0.8,
        ],
        "line-width": [
          "interpolate",
          ["exponential", 1.4],
          ["zoom"],
          0,
          0.5,
          5,
          1.1,
          10,
          2,
        ],
      },
    },
    {
      id: "boundary-disputed",
      type: "line",
      source: "world",
      "source-layer": "boundaries",
      filter: ["in", "Disputed", ["get", "FEATURECLA"]],
      layout: { "line-join": "round" },
      paint: {
        "line-color": "#ffffff",
        "line-opacity": 0.6,
        "line-dasharray": [2, 2],
        "line-width": [
          "interpolate",
          ["exponential", 1.4],
          ["zoom"],
          0,
          0.5,
          5,
          1.1,
          10,
          2,
        ],
      },
    },
    {
      id: "region-labels",
      type: "symbol",
      source: "regions",
      "source-layer": "region-labels",
      minzoom: 6.5,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Italic"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 6.5, 10, 10, 14],
        "text-max-width": 8,
      },
      paint: {
        "text-color": "rgba(255, 255, 255, 0.85)",
        "text-halo-color": "rgba(0, 0, 0, 0.7)",
        "text-halo-width": 1.2,
      },
    },
    {
      id: "city-dots",
      type: "circle",
      source: "world",
      "source-layer": "places",
      minzoom: 4,
      maxzoom: 15,
      filter: ["<=", ["get", "scalerank"], ["+", ["floor", ["zoom"]], -2]],
      paint: {
        "circle-color": "#ffffff",
        "circle-opacity": 0.9,
        "circle-radius": ["case", ["==", ["get", "capital"], 1], 3, 2],
        "circle-stroke-color": "#000000",
        "circle-stroke-opacity": 0.4,
        "circle-stroke-width": 1,
      },
    },
    {
      id: "city-labels",
      type: "symbol",
      source: "world",
      "source-layer": "places",
      minzoom: 4,
      filter: ["<=", ["get", "scalerank"], ["+", ["floor", ["zoom"]], -2]],
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          4,
          ["case", ["==", ["get", "capital"], 1], 12, 11],
          10,
          ["case", ["==", ["get", "capital"], 1], 16, 14],
        ],
        "text-variable-anchor": ["top", "bottom", "left", "right"],
        "text-radial-offset": 0.4,
        "text-justify": "auto",
        "symbol-sort-key": ["get", "scalerank"],
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "rgba(0, 0, 0, 0.85)",
        "text-halo-width": 1.4,
      },
    },
    {
      id: "country-labels",
      type: "symbol",
      source: "world",
      "source-layer": "country-labels",
      maxzoom: 9,
      filter: ["<=", ["get", "scalerank"], ["+", ["*", ["zoom"], 2.5], 0.5]],
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Medium"],
        "text-transform": "uppercase",
        "text-letter-spacing": 0.15,
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          1,
          ["-", 13, ["get", "scalerank"]],
          6,
          ["-", 22, ["get", "scalerank"]],
        ],
        "text-max-width": 7,
        "symbol-sort-key": ["get", "scalerank"],
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "rgba(0, 0, 0, 0.8)",
        "text-halo-width": 1.6,
        "text-opacity": ["interpolate", ["linear"], ["zoom"], 7, 1, 9, 0],
      },
    },
  ],
}

/**
 * GADM subdivisions (regions.pmtiles, ~113MB) are both license-restricted
 * (GADM forbids redistribution) and too large for static hosts like Vercel,
 * so they are not deployed. The layer is enabled only when a tiles URL is
 * available: it defaults to the bundled local file for development. In
 * production NEXT_PUBLIC_MAP_REGIONS_URL is set to "off" to disable it; set
 * it to a hosted .pmtiles URL (a host that allows large files) to turn it on.
 */
const REGIONS_TILES_URL =
  process.env.NEXT_PUBLIC_MAP_REGIONS_URL ?? "/map/regions.pmtiles"
const regionsEnabled =
  REGIONS_TILES_URL.length > 0 && REGIONS_TILES_URL !== "off"

function buildStyle(): StyleSpecification {
  if (regionsEnabled) {
    return {
      ...baseStyle,
      sources: {
        ...baseStyle.sources,
        regions: {
          type: "vector",
          url: `pmtiles://${REGIONS_TILES_URL}`,
          promoteId: { regions: "gid" },
        },
      },
    }
  }
  // Drop the regions source and every layer that reads from it, so nothing
  // requests the undeployed tiles.
  return {
    ...baseStyle,
    sources: Object.fromEntries(
      Object.entries(baseStyle.sources).filter(([id]) => id !== "regions")
    ),
    layers: baseStyle.layers.filter(
      (layer) => !("source" in layer && layer.source === "regions")
    ),
  }
}

export const mapStyle: StyleSpecification = buildStyle()
