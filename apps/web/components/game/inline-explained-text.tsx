"use client"

import type { ReactNode } from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

export interface TextAnnotation {
  term: string
  explanation: string
}

interface AnnotationSpan extends TextAnnotation {
  start: number
  end: number
}

const FALLBACK_GLOSSARY: TextAnnotation[] = [
  {
    term: "mobilize",
    explanation:
      "Prepare troops, supplies, and transport so military forces can deploy.",
  },
  {
    term: "mobiliser",
    explanation:
      "Preparer les troupes, les approvisionnements et les transports pour deployer les forces.",
  },
  {
    term: "frontier",
    explanation:
      "A politically sensitive border region where rival forces may concentrate.",
  },
  {
    term: "frontiere",
    explanation:
      "Une zone frontaliere sensible ou des forces rivales peuvent se concentrer.",
  },
  {
    term: "embargo",
    explanation:
      "A trade ban used to pressure another state without immediately going to war.",
  },
  {
    term: "tariff",
    explanation:
      "A tax on imports that can protect local producers but raise prices.",
  },
  {
    term: "tarif douanier",
    explanation:
      "Une taxe sur les importations qui protege les producteurs locaux mais peut augmenter les prix.",
  },
  {
    term: "subsidies",
    explanation:
      "State support that lowers costs for favored industries or institutions.",
  },
  {
    term: "subventions",
    explanation:
      "Un soutien de l'Etat qui reduit les couts d'industries ou d'institutions prioritaires.",
  },
  {
    term: "fortify",
    explanation:
      "Improve defensive positions with works, supply depots, and prepared fallback lines.",
  },
  {
    term: "fortifier",
    explanation:
      "Renforcer les positions defensives avec des ouvrages, depots et lignes de repli.",
  },
  {
    term: "envoys",
    explanation:
      "Diplomatic representatives sent to negotiate or gather political intelligence.",
  },
  {
    term: "emissaires",
    explanation:
      "Des representants diplomatiques envoyes negocier ou recueillir des informations politiques.",
  },
]

export function InlineExplainedText({
  text,
  annotations = [],
  fallback = true,
}: {
  text: string
  annotations?: TextAnnotation[]
  fallback?: boolean
}) {
  const spans = buildAnnotationSpans(
    text,
    fallback ? [...annotations, ...fallbackAnnotations(text)] : annotations
  )

  if (spans.length === 0) return text

  const parts: ReactNode[] = []
  let cursor = 0

  spans.forEach((span, index) => {
    if (span.start > cursor) {
      parts.push(text.slice(cursor, span.start))
    }
    parts.push(
      <Tooltip key={`${span.start}-${span.end}-${index}`}>
        <TooltipTrigger
          render={
            <button
              type="button"
              className="inline cursor-help rounded-sm border-b border-dotted border-primary/70 bg-primary/5 px-0.5 font-medium text-current underline-offset-2 transition-colors hover:bg-primary/10"
            />
          }
        >
          {text.slice(span.start, span.end)}
        </TooltipTrigger>
        <TooltipContent className="max-w-[18rem] p-2 text-left leading-relaxed">
          <span className="block text-[10px] font-semibold tracking-wide text-white/60 uppercase">
            {span.term}
          </span>
          <span className="mt-0.5 block font-normal">{span.explanation}</span>
        </TooltipContent>
      </Tooltip>
    )
    cursor = span.end
  })

  if (cursor < text.length) {
    parts.push(text.slice(cursor))
  }

  return <>{parts}</>
}

function fallbackAnnotations(text: string): TextAnnotation[] {
  const normalized = normalizeText(text)
  return FALLBACK_GLOSSARY.filter(({ term }) =>
    normalized.includes(normalizeText(term))
  ).slice(0, 3)
}

function buildAnnotationSpans(
  text: string,
  annotations: TextAnnotation[]
): AnnotationSpan[] {
  const normalized = normalizeText(text)
  const candidates = annotations
    .map(({ term, explanation }) => {
      const cleanTerm = term.trim()
      const cleanExplanation = explanation.trim()
      if (!cleanTerm || !cleanExplanation) return null
      const start = normalized.indexOf(normalizeText(cleanTerm))
      if (start < 0) return null
      return {
        term: text.slice(start, start + cleanTerm.length),
        explanation: cleanExplanation,
        start,
        end: start + cleanTerm.length,
      }
    })
    .filter((span): span is AnnotationSpan => span !== null)
    .sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start))

  const spans: AnnotationSpan[] = []
  for (const candidate of candidates) {
    if (
      spans.some(
        (span) => candidate.start < span.end && candidate.end > span.start
      )
    ) {
      continue
    }
    spans.push(candidate)
  }

  return spans
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
}
