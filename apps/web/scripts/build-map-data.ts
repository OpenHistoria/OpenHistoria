// Rebuilds the map data under public/map/.
//
// - world.pmtiles: countries, country borders/labels, cities (Natural Earth
//   10m, public domain, committed to git).
// - regions.pmtiles: first-level subdivisions (GADM 4.1). GADM data is free
//   for non-commercial use but may NOT be redistributed, so this file is
//   gitignored: every contributor/deployment generates it locally.
//
// Requires: tippecanoe, gdal (ogr2ogr), curl, unzip.
//
// Usage: bun scripts/build-map-data.ts [--world] [--regions] [--force]
//        (no flags = build whatever is missing)

import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const NE_BASE =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson"
const NE_SOURCES = {
  countries: `${NE_BASE}/ne_10m_admin_0_countries.geojson`,
  boundaries: `${NE_BASE}/ne_10m_admin_0_boundary_lines_land.geojson`,
  // Full (not _simple) populated places: it carries the localized NAME_EN /
  // NAME_FR / ... columns the map uses to render city labels per locale.
  places: `${NE_BASE}/ne_10m_populated_places.geojson`,
}
const GADM_URL = "https://geodata.ucdavis.edu/gadm/gadm4.1/gadm_410-levels.zip"

type Feature = {
  type: "Feature"
  geometry: { type: string; coordinates: unknown }
  // Natural Earth properties are heterogeneous; values get reassigned wholesale.
  properties: Record<string, unknown>
}
type FeatureCollection = { type: "FeatureCollection"; features: Feature[] }

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const mapDir = path.join(webDir, "public", "map")
const cacheDir = path.join(os.homedir(), ".cache", "openhistoria")
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "openhistoria-map-"))

const argv = new Set(process.argv.slice(2))
const force = argv.has("--force")
const only = argv.has("--world") || argv.has("--regions")
const wantWorld = !only || argv.has("--world")
const wantRegions = !only || argv.has("--regions")

const run = (cmd: string, args: string[]) =>
  execFileSync(cmd, args, { stdio: ["ignore", "inherit", "inherit"] })

const reportDone = (outFile: string) => {
  const size = (fs.statSync(outFile).size / 1024 / 1024).toFixed(1)
  console.log(`done: ${outFile} (${size} MB)`)
}

async function download(name: string, url: string): Promise<string> {
  const file = path.join(workDir, `${name}.geojson`)
  console.log(`downloading ${name}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  fs.writeFileSync(file, new Uint8Array(await res.arrayBuffer()))
  return file
}

async function buildWorld(): Promise<void> {
  const outFile = path.join(mapDir, "world.pmtiles")
  if (fs.existsSync(outFile) && !force) {
    console.log("world.pmtiles exists, skipping (use --force to rebuild)")
    return
  }

  const [countriesFile, boundariesFile, placesFile] = await Promise.all([
    download("countries", NE_SOURCES.countries),
    download("boundaries", NE_SOURCES.boundaries),
    download("places", NE_SOURCES.places),
  ])

  console.log("preparing world layers...")

  // Country label points from Natural Earth's hand-placed LABEL_X/LABEL_Y.
  const countries: FeatureCollection = JSON.parse(
    fs.readFileSync(countriesFile, "utf8")
  )
  const labels: FeatureCollection = {
    type: "FeatureCollection",
    features: countries.features
      .filter(
        (f) => f.properties.LABEL_X != null && f.properties.LABEL_Y != null
      )
      .map((f) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [f.properties.LABEL_X, f.properties.LABEL_Y],
        },
        properties: {
          name: f.properties.NAME,
          name_long: f.properties.NAME_LONG,
          iso_a2: f.properties.ISO_A2_EH,
          scalerank: f.properties.LABELRANK,
          pop: f.properties.POP_EST,
        },
      })),
  }
  const labelsFile = path.join(workDir, "country-labels.geojson")
  fs.writeFileSync(labelsFile, JSON.stringify(labels))

  // Slim country polygons to what the game needs.
  for (const f of countries.features) {
    const p = f.properties
    f.properties = {
      name: p.NAME,
      iso_a2: p.ISO_A2_EH,
      iso_a3: p.ISO_A3_EH,
      continent: p.CONTINENT,
    }
  }
  const countriesSlimFile = path.join(workDir, "countries-slim.geojson")
  fs.writeFileSync(countriesSlimFile, JSON.stringify(countries))

  // Slim populated places.
  const places: FeatureCollection = JSON.parse(
    fs.readFileSync(placesFile, "utf8")
  )
  // The full places dataset uses uppercase property names and ships a
  // localized name per language (NAME_EN, NAME_FR, ...); carry the ones the
  // app's locales need so city labels can be rendered per locale.
  for (const f of places.features) {
    const p = f.properties
    f.properties = {
      name: p.NAME,
      name_en: p.NAME_EN,
      name_fr: p.NAME_FR,
      scalerank: p.SCALERANK,
      pop: p.POP_MAX,
      capital: p.ADM0CAP === 1 ? 1 : 0,
      country: p.ADM0NAME,
    }
  }
  const placesSlimFile = path.join(workDir, "places-slim.geojson")
  fs.writeFileSync(placesSlimFile, JSON.stringify(places))

  console.log("running tippecanoe (world)...")
  run("tippecanoe", [
    "-o",
    outFile,
    "--force",
    // Vector data tops out at z8; MapLibre overzooms beyond that.
    "-Z0",
    "-z8",
    // Keep every point at every zoom: tippecanoe's default drop rate would
    // silently remove most country labels and city dots at low zooms.
    "-r1",
    "--detect-shared-borders",
    "--coalesce-densest-as-needed",
    "--no-tile-size-limit",
    "--no-feature-limit",
    "-L",
    `countries:${countriesSlimFile}`,
    "-L",
    `boundaries:${boundariesFile}`,
    "-L",
    `country-labels:${labelsFile}`,
    "-L",
    `places:${placesSlimFile}`,
  ])
  reportDone(outFile)
}

function buildRegions(): void {
  const outFile = path.join(mapDir, "regions.pmtiles")
  if (fs.existsSync(outFile) && !force) {
    console.log("regions.pmtiles exists, skipping (use --force to rebuild)")
    return
  }

  fs.mkdirSync(cacheDir, { recursive: true })
  const gpkg = path.join(cacheDir, "gadm_410-levels.gpkg")
  if (!fs.existsSync(gpkg)) {
    const zip = path.join(cacheDir, "gadm_410-levels.zip")
    console.log("downloading GADM 4.1 (~2.7 GB, resumable)...")
    // -C - resumes a partial file, so rerunning after an interrupted
    // download continues instead of starting over.
    run("curl", [
      "-L",
      "-C",
      "-",
      "--retry",
      "5",
      "--retry-all-errors",
      "-o",
      zip,
      GADM_URL,
    ])
    try {
      run("unzip", ["-t", "-qq", zip])
    } catch {
      fs.rmSync(zip)
      throw new Error(
        "GADM zip is corrupt or truncated; deleted it. Rerun to redownload."
      )
    }
    console.log("extracting GADM geopackage...")
    run("unzip", ["-o", zip, "-d", cacheDir])
    fs.rmSync(zip)
  }

  // GADM ships 6 admin levels; the game only needs level 1 (states/regions),
  // since countries already come from Natural Earth. Strip everything else
  // and keep only the fields we use.
  console.log("extracting level-1 subdivisions...")
  const regionsFile = path.join(workDir, "regions.fgb")
  run("ogr2ogr", [
    "-f",
    "FlatGeobuf",
    regionsFile,
    gpkg,
    "-dialect",
    "sqlite",
    "-sql",
    "SELECT GID_1 AS gid, NAME_1 AS name, COUNTRY AS country, ENGTYPE_1 AS type, geom FROM ADM_1",
    "-nlt",
    "MULTIPOLYGON",
  ])

  console.log("computing region label points...")
  const regionLabelsFile = path.join(workDir, "region-labels.geojson")
  run("ogr2ogr", [
    "-f",
    "GeoJSON",
    regionLabelsFile,
    gpkg,
    "-dialect",
    "sqlite",
    "-sql",
    "SELECT GID_1 AS gid, NAME_1 AS name, COUNTRY AS country, ST_PointOnSurface(geom) AS geom FROM ADM_1",
  ])

  console.log("running tippecanoe (regions)...")
  run("tippecanoe", [
    "-o",
    outFile,
    "--force",
    // Regions only matter once zoomed in; z10 keeps borders crisp deep into
    // city-level zooms via overzooming.
    "-Z4",
    "-z10",
    "-r1",
    "--detect-shared-borders",
    "--no-tile-size-limit",
    "--no-feature-limit",
    "-L",
    `regions:${regionsFile}`,
    "-L",
    `region-labels:${regionLabelsFile}`,
  ])
  reportDone(outFile)
}

fs.mkdirSync(mapDir, { recursive: true })
if (wantWorld) await buildWorld()
if (wantRegions) buildRegions()
fs.rmSync(workDir, { recursive: true, force: true })
