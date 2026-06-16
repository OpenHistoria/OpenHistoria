"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  PauseIcon,
  VolumeHighIcon,
  VolumeOffIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

import { useI18n } from "@/hooks/use-i18n"
import { useSpeechReader } from "@/hooks/use-speech-reader"

export function SpeechButton({ text }: { text: string }) {
  const { t, locale } = useI18n()
  const reader = useSpeechReader(locale)
  const label = reader.busy ? t.game.speechStop : t.game.speechRead
  const Icon = reader.busy
    ? PauseIcon
    : reader.supported
      ? VolumeHighIcon
      : VolumeOffIcon

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={label}
            disabled={!reader.supported}
            onClick={() => void reader.speak(text)}
          />
        }
      >
        <HugeiconsIcon icon={Icon} strokeWidth={2} className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent>
        {reader.supported ? label : t.game.speechUnsupported}
      </TooltipContent>
    </Tooltip>
  )
}
