"use client"

import type { Feature, FeatureCollection, Geometry } from "geojson"
import type { LeafletMouseEvent, PathOptions, Layer } from "leaflet"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { useMap, useMapEvents } from "react-leaflet"

import { useMapSelection } from "@/components/map-country-regions"

const GeoJSON = dynamic(
  () => import("react-leaflet").then((mod) => mod.GeoJSON),
  { ssr: false }
)

interface RegionProperties {
  name?: string
  name_en?: string
  admin?: string
  iso_3166_2?: string
}

type RegionFeature = Feature<Geometry, RegionProperties>

const base: PathOptions = {
  fillColor: "#e8cf9c",
  fillOpacity: 0,
  color: "#e8cf9c",
  weight: 1,
  opacity: 0.55,
  dashArray: "4 4",
}

const hover: PathOptions = {
  fillColor: "#e8cf9c",
  fillOpacity: 0.2,
  color: "#f4dca8",
  weight: 2,
  opacity: 1,
  dashArray: "0",
}

const selectedStyle: PathOptions = {
  fillColor: "#f0d89c",
  fillOpacity: 0.35,
  color: "#f6df9a",
  weight: 2.5,
  opacity: 1,
  dashArray: "0",
}

const MIN_ZOOM_VISIBLE = 4

export function MapStates() {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())
  const [data, setData] = useState<FeatureCollection<
    Geometry,
    RegionProperties
  > | null>(null)
  const { selected, setSelected } = useMapSelection()

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  })

  useEffect(() => {
    if (zoom < MIN_ZOOM_VISIBLE) return
    if (data) return
    let cancelled = false
    fetch("/data/regions-10m.geojson")
      .then((r) => r.json())
      .then((json: FeatureCollection<Geometry, RegionProperties>) => {
        if (!cancelled) setData(json)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [zoom, data])

  if (zoom < MIN_ZOOM_VISIBLE || !data) return null

  const onEachFeature = (feature: RegionFeature, layer: Layer) => {
    const props = feature.properties ?? {}
    const name = props.name_en ?? props.name ?? "Unknown"
    const country = props.admin ?? "Unknown"
    const isSelected = () =>
      selected !== null &&
      selected.type === "region" &&
      selected.name === name &&
      selected.country === country
    const pathLayer = layer as L.Path

    layer.on({
      mouseover: () => {
        if (!isSelected()) pathLayer.setStyle(hover)
      },
      mouseout: () => {
        if (!isSelected()) pathLayer.setStyle(base)
      },
      click: (event: LeafletMouseEvent) => {
        setSelected({ type: "region", name, country })
        event.originalEvent.stopPropagation()
      },
    })
  }

  return (
    <GeoJSON
      data={data}
      style={(feature) => {
        if (!feature) return base
        const props = feature.properties as RegionProperties
        const name = props.name_en ?? props.name
        const country = props.admin
        return selected &&
          selected.type === "region" &&
          selected.name === name &&
          selected.country === country
          ? selectedStyle
          : base
      }}
      onEachFeature={onEachFeature}
      key={
        selected?.type === "region"
          ? `${selected.country}/${selected.name}`
          : "none"
      }
    />
  )
}
