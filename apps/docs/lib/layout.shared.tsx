import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "OpenHistoria",
      url: "/docs",
    },
    links: [
      {
        text: "Play",
        url: "http://localhost:3000",
        external: true,
      },
      {
        text: "GitHub",
        url: "https://github.com/OpenHistoria/OpenHistoria",
        external: true,
      },
    ],
  }
}
