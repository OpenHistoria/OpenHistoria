"use client"

import {
  Map,
  MapFullscreenControl,
  MapLocateControl,
  MapSearchControl,
  MapTileLayer,
  MapZoomControl,
} from "@workspace/ui/components/map"

export function HomeMap() {
  return (
    <Map
      center={[20, 0]}
      zoom={3}
      maxZoom={18}
      className="h-svh w-full rounded-none"
    >
      <MapTileLayer />
      <MapSearchControl position="top-2 left-2" placeholder="Search a place…" />
      <MapZoomControl position="top-2 left-64" />
      <MapFullscreenControl position="top-2 right-2" />
      <MapLocateControl position="bottom-2 right-2" />
    </Map>
  )
}
