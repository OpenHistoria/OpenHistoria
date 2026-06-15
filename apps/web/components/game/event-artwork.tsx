"use client"

import type { CSSProperties } from "react"
import Image from "next/image"

import type { GameEvent } from "@workspace/engine"

const THEMES: Record<
  GameEvent["kind"],
  { sky: string; ground: string; accent: string; sun: string }
> = {
  political: {
    sky: "#dbeafe",
    ground: "#64748b",
    accent: "#2563eb",
    sun: "#f8fafc",
  },
  military: {
    sky: "#fee2e2",
    ground: "#7f1d1d",
    accent: "#dc2626",
    sun: "#fed7aa",
  },
  economic: {
    sky: "#fef3c7",
    ground: "#92400e",
    accent: "#d97706",
    sun: "#fde68a",
  },
  diplomatic: {
    sky: "#ede9fe",
    ground: "#4c1d95",
    accent: "#7c3aed",
    sun: "#f5f3ff",
  },
  social: {
    sky: "#dcfce7",
    ground: "#14532d",
    accent: "#16a34a",
    sun: "#bbf7d0",
  },
  scientific: {
    sky: "#cffafe",
    ground: "#164e63",
    accent: "#0891b2",
    sun: "#ecfeff",
  },
  disaster: {
    sky: "#ffedd5",
    ground: "#7c2d12",
    accent: "#ea580c",
    sun: "#fdba74",
  },
}

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")

const sceneFor = (event: GameEvent) => {
  const text =
    `${event.title} ${event.description} ${event.location?.label ?? ""}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")

  if (
    /\b(port|ship|fleet|naval|maritime|harbor|harbour|boat|navire|flotte|portuaire|maritime)\b/.test(
      text
    )
  ) {
    return "maritime"
  }
  if (/\b(rice|grain|wheat|harvest|food|riz|ble|recolte|famine)\b/.test(text)) {
    return "harvest"
  }
  if (event.kind === "military") return "front"
  if (event.kind === "scientific") return "laboratory"
  if (event.kind === "diplomatic") return "delegation"
  if (event.kind === "economic") return "market"
  return "city"
}

function motif(scene: string, theme: (typeof THEMES)[GameEvent["kind"]]) {
  if (scene === "maritime") {
    return `
      <path d="M0 132 C50 122 96 142 150 132 C204 122 250 142 300 132 L300 180 L0 180 Z" fill="${theme.ground}" opacity=".72"/>
      <path d="M68 96 L132 96 L118 121 L82 121 Z" fill="#f8fafc" opacity=".92"/>
      <path d="M100 48 L100 96 L145 96 Z" fill="${theme.accent}" opacity=".92"/>
      <path d="M97 58 L97 96 L62 96 Z" fill="#ffffff" opacity=".82"/>
      <rect x="186" y="78" width="56" height="38" rx="3" fill="#ffffff" opacity=".76"/>
      <rect x="194" y="88" width="40" height="7" fill="${theme.accent}" opacity=".7"/>
    `
  }
  if (scene === "harvest") {
    return `
      <path d="M0 116 C56 94 110 136 164 112 C218 88 256 108 300 96 L300 180 L0 180 Z" fill="${theme.ground}" opacity=".72"/>
      <path d="M62 75 C78 92 76 119 66 139" stroke="#f8fafc" stroke-width="5" fill="none" opacity=".85"/>
      <path d="M102 70 C118 92 116 123 104 144" stroke="#f8fafc" stroke-width="5" fill="none" opacity=".85"/>
      <path d="M147 77 C161 99 158 126 146 145" stroke="#f8fafc" stroke-width="5" fill="none" opacity=".85"/>
      <rect x="196" y="90" width="52" height="42" rx="7" fill="${theme.accent}" opacity=".82"/>
    `
  }
  if (scene === "front") {
    return `
      <path d="M0 124 L300 96 L300 180 L0 180 Z" fill="${theme.ground}" opacity=".76"/>
      <path d="M58 64 L58 139" stroke="#f8fafc" stroke-width="5"/>
      <path d="M62 67 L124 82 L62 98 Z" fill="${theme.accent}"/>
      <path d="M178 77 L226 77 L242 118 L158 118 Z" fill="#f8fafc" opacity=".78"/>
    `
  }
  if (scene === "laboratory") {
    return `
      <path d="M0 125 L300 112 L300 180 L0 180 Z" fill="${theme.ground}" opacity=".7"/>
      <circle cx="92" cy="86" r="30" fill="#f8fafc" opacity=".72"/>
      <path d="M170 58 L206 58 L226 130 L150 130 Z" fill="#f8fafc" opacity=".8"/>
      <path d="M166 108 L210 108" stroke="${theme.accent}" stroke-width="9" opacity=".85"/>
    `
  }
  if (scene === "delegation") {
    return `
      <path d="M0 122 C80 112 126 132 300 110 L300 180 L0 180 Z" fill="${theme.ground}" opacity=".7"/>
      <rect x="82" y="86" width="136" height="32" rx="6" fill="#f8fafc" opacity=".82"/>
      <circle cx="110" cy="72" r="13" fill="${theme.accent}"/>
      <circle cx="190" cy="72" r="13" fill="${theme.accent}"/>
      <path d="M124 76 C144 91 160 91 176 76" stroke="#f8fafc" stroke-width="6" fill="none"/>
    `
  }
  return `
    <path d="M0 125 C64 110 118 132 174 115 C230 98 268 104 300 94 L300 180 L0 180 Z" fill="${theme.ground}" opacity=".72"/>
    <rect x="54" y="78" width="44" height="58" rx="3" fill="#f8fafc" opacity=".78"/>
    <rect x="118" y="58" width="56" height="78" rx="3" fill="${theme.accent}" opacity=".86"/>
    <rect x="194" y="88" width="50" height="48" rx="3" fill="#f8fafc" opacity=".68"/>
  `
}

function eventArtworkUrl(event: GameEvent) {
  const theme = THEMES[event.kind]
  const label = escapeXml(event.location?.label ?? event.title)
  const scene = sceneFor(event)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 180" role="img" aria-label="${label}">
      <rect width="300" height="180" fill="${theme.sky}"/>
      <circle cx="236" cy="42" r="24" fill="${theme.sun}" opacity=".9"/>
      <path d="M0 122 C70 100 116 124 168 102 C224 78 266 88 300 72 L300 180 L0 180 Z" fill="${theme.accent}" opacity=".18"/>
      ${motif(scene, theme)}
      <rect y="130" width="300" height="50" fill="url(#fade)"/>
      <defs>
        <linearGradient id="fade" x1="0" x2="0" y1="0" y2="1">
          <stop stop-color="#000000" stop-opacity="0"/>
          <stop offset="1" stop-color="#000000" stop-opacity=".28"/>
        </linearGradient>
      </defs>
    </svg>
  `
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function EventArtwork({
  event,
  className,
  style,
}: {
  event: GameEvent
  className?: string
  style?: CSSProperties
}) {
  return (
    <Image
      src={eventArtworkUrl(event)}
      alt=""
      width={300}
      height={180}
      unoptimized
      className={className}
      style={style}
      aria-hidden="true"
    />
  )
}
