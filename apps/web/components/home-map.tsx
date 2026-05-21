"use client"

import {
  Map,
  MapFullscreenControl,
  MapLocateControl,
  MapSearchControl,
  MapTileLayer,
  MapZoomControl,
} from "@workspace/ui/components/map"

import { BriefingPanel } from "@/components/briefing-panel"
import { HomeHud } from "@/components/home-hud"
import { MapCities } from "@/components/map-cities"
import { MapCountryLabels } from "@/components/map-country-labels"
import {
  CountrySelectionProvider,
  MapCountryRegions,
  SelectedCountryIndicator,
} from "@/components/map-country-regions"
import { MapStates } from "@/components/map-states"
import { MapTextureOverlay } from "@/components/map-texture-overlay"
import { ProjectMarkers } from "@/components/project-markers"
import { TimeControls } from "@/components/time-controls"

export function HomeMap() {
  return (
    <Map
      center={[20, 0]}
      zoom={3}
      maxZoom={18}
      className="h-svh w-full rounded-none [&_.map-satellite-tiles]:[filter:brightness(0.78)_saturate(1.25)_contrast(1.05)_hue-rotate(-6deg)]"
    >
      <CountrySelectionProvider>
        <MapTileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          darkUrl="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
          maxNativeZoom={18}
          className="map-satellite-tiles"
        />
        <MapCountryRegions />
        <MapStates />
        <MapCountryLabels />
        <MapCities />
        <MapTextureOverlay />
        <MapSearchControl
          position="top-2 left-2"
          placeholder="Search a place…"
        />
        <MapZoomControl position="top-2 left-64" />
        <MapFullscreenControl position="top-2 right-2" />
        <MapLocateControl position="top-11 right-2" />
        <ProjectMarkers />
        <SelectedCountryIndicator />
        <HomeHud
          bottomRight={
            <div className="flex flex-col items-end gap-2">
              <BriefingPanel />
              <TimeControls />
            </div>
          }
        />
      </CountrySelectionProvider>
    </Map>
  )
}
