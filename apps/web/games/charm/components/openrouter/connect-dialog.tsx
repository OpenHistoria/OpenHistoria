"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowUpRight01Icon,
  CheckmarkCircle02Icon,
  LockKeyIcon,
} from "@hugeicons/core-free-icons"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Separator } from "@workspace/ui/components/separator"
import { Spinner } from "@workspace/ui/components/spinner"

import { useOpenRouter } from "@/games/charm/hooks/use-openrouter"
import { formatOpenRouterError } from "@/games/charm/lib/errors"
import {
  OPENROUTER_DASHBOARD_URL,
  beginOpenRouterAuth,
} from "@/games/charm/lib/openrouter"
import { OpenRouterLogo } from "@/games/charm/components/openrouter/openrouter-logo"

const STEPS = [
  {
    title: "Authorize Open Charm",
    detail: "You'll be sent to OpenRouter to approve an app-scoped key.",
  },
  {
    title: "Pick or top up a model",
    detail: "Use any model OpenRouter offers, including free ones.",
  },
  {
    title: "Return and play",
    detail: "Your key is stored in this browser only, never on our servers.",
  },
]

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

export function ConnectDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { status, keyInfo, infoError, disconnect } = useOpenRouter()
  const [redirecting, setRedirecting] = useState(false)

  const connect = () => {
    setRedirecting(true)
    void beginOpenRouterAuth().catch(() => setRedirecting(false))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" closeLabel="Close">
        <DialogHeader>
          <OpenRouterLogo className="size-4" />
          <DialogTitle>
            {status === "connected"
              ? "OpenRouter connected"
              : "Connect OpenRouter"}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {status === "connected"
            ? "Your encounters are powered by your own OpenRouter account."
            : "Open Charm runs on your own model. Connect OpenRouter to begin."}
        </DialogDescription>

        {status === "loading" && (
          <div className="flex items-center justify-center py-6">
            <Spinner />
          </div>
        )}

        {status === "disconnected" && (
          <>
            <ol className="grid gap-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="grid gap-0.5">
                    <span className="font-medium">{step.title}</span>
                    <span className="text-muted-foreground">{step.detail}</span>
                  </div>
                </li>
              ))}
            </ol>

            <Alert>
              <HugeiconsIcon icon={LockKeyIcon} strokeWidth={2} />
              <AlertTitle>Private by design</AlertTitle>
              <AlertDescription>
                The key lives in this browser and is sent only to OpenRouter.
                Revoke or cap it anytime from your dashboard.
              </AlertDescription>
            </Alert>
          </>
        )}

        {status === "connected" && (
          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2.5">
              <div className="grid gap-0.5">
                <span className="font-medium">
                  {keyInfo?.label || "Open Charm key"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {keyInfo
                    ? keyInfo.limit === null
                      ? `${usd.format(keyInfo.usage)} used`
                      : `${usd.format(keyInfo.usage)} of ${usd.format(keyInfo.limit)} used`
                    : infoError
                      ? "Usage unavailable"
                      : "Checking usage..."}
                </span>
              </div>
              <Badge variant="secondary" className="gap-1">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
                Connected
              </Badge>
            </div>

            {keyInfo?.isFreeTier && (
              <p className="text-xs text-muted-foreground">
                You&apos;re on the free tier. Free models work great for
                encounters.
              </p>
            )}

            {infoError && (
              <Alert variant="destructive">
                <AlertTitle>Could not verify the key</AlertTitle>
                <AlertDescription>
                  {formatOpenRouterError(infoError)}
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            <p className="text-xs text-muted-foreground">
              Manage this key from your{" "}
              <a
                href={OPENROUTER_DASHBOARD_URL}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-3 hover:text-foreground"
              >
                OpenRouter dashboard
              </a>
              .
            </p>
          </div>
        )}

        <DialogFooter>
          {status === "disconnected" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Not now
              </Button>
              <Button onClick={connect} disabled={redirecting}>
                {redirecting ? (
                  <Spinner />
                ) : (
                  <OpenRouterLogo className="size-3.5" />
                )}
                {redirecting ? "Redirecting..." : "Connect"}
              </Button>
            </>
          )}
          {status === "connected" && (
            <>
              <Button variant="destructive" onClick={disconnect}>
                Disconnect
              </Button>
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <a
                    href={OPENROUTER_DASHBOARD_URL}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                Open dashboard
                <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} />
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
