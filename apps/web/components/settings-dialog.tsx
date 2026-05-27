"use client"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  MonitorIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  Volume2Icon,
  VolumeXIcon,
  type LucideIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useState } from "react"

import { isMuted, setMuted, sfx } from "@/lib/sfx"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const THEME_OPTIONS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: "light", label: "Light", Icon: SunIcon },
  { key: "dark", label: "Dark", Icon: MoonIcon },
  { key: "system", label: "System", Icon: MonitorIcon },
]

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme()
  const [muted, setMutedState] = useState<boolean>(() => isMuted())
  const currentTheme = theme ?? "dark"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="size-4" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Persisted in this browser only.
          </DialogDescription>
        </DialogHeader>

        <section className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Appearance
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-md border bg-muted/40 p-1">
            {THEME_OPTIONS.map(({ key, label, Icon }) => {
              const active = currentTheme === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTheme(key)}
                  className={
                    "flex items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-xs transition-colors " +
                    (active
                      ? "bg-background font-medium"
                      : "text-muted-foreground hover:bg-background/60")
                  }
                  aria-pressed={active}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              )
            })}
          </div>
        </section>

        <section className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Audio
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const next = !muted
              setMuted(next)
              setMutedState(next)
              if (!next) sfx.click()
            }}
            aria-pressed={muted}
            className="justify-start"
          >
            {muted ? <VolumeXIcon /> : <Volume2Icon />}
            {muted ? "Sound off" : "Sound on"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Synthesised cues play on project completion, event arrival,
            warnings, and achievement unlocks.
          </p>
        </section>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
