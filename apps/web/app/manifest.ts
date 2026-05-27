import type { MetadataRoute } from "next"

/**
 * Web app manifest so the player can install Open Historia to their home
 * screen / desktop. Icons reuse the existing /icons assets; the satellite
 * basemap demands a dark background so we hard-code that here.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Open Historia",
    short_name: "Open Historia",
    description:
      "A grand strategy sandbox game. Open source alternative to Pax Historia.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    orientation: "any",
    categories: ["games", "strategy", "simulation"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  }
}
