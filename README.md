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

### Supabase (optional)

Games are stored in the browser's localStorage by default. With Supabase configured, they are stored in Postgres instead: players get an anonymous guest session automatically, can later attach an email to turn it into a real account (keeping all their games), and every AI message is timestamped in the database.

To self-host the relevant parts locally (Postgres + Auth + REST API, requires Docker):

```sh
bun run supabase:start    # boots the stack and applies supabase/migrations
```

Then copy the printed `API URL` and `anon key` into `apps/web/.env.local` (see `apps/web/.env.example`):

```sh
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
```

Useful endpoints while developing: Studio at http://127.0.0.1:54323 to inspect tables, and the mail catcher at http://127.0.0.1:54324 where account-upgrade confirmation emails land. `bun run supabase:reset` reapplies migrations from scratch; `bun run supabase:stop` shuts the stack down.

## License

[AGPL v3.0](./LICENSE)
