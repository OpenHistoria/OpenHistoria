# Open Historia

> A grand strategy sandbox game. Open source alternative to Pax Historia.

## Development

```sh
bun install
bun dev
```

### Map data

The map is a satellite hybrid built with [MapLibre GL](https://maplibre.org/) and [PMTiles](https://docs.protomaps.com/pmtiles/):

- Satellite imagery streams from Esri World Imagery.
- `apps/web/public/map/world.pmtiles` (committed): countries, borders, labels and cities from Natural Earth 10m (public domain).
- `apps/web/public/map/regions.pmtiles` (not committed): first-level subdivisions from [GADM 4.1](https://gadm.org/). GADM is free for non-commercial use but forbids redistribution, so each contributor and deployment generates this file locally. The map works without it; you just lose region borders and labels.

To (re)generate the data files (requires `tippecanoe`, `gdal`, `curl`, `unzip`):

```sh
cd apps/web
bun run build:map-data            # builds whatever is missing
bun run build:map-data --force    # rebuilds everything
```

The first regions build downloads ~2.7 GB from GADM (cached in `~/.cache/openhistoria`).

## License

[AGPL v3.0](./LICENSE)
