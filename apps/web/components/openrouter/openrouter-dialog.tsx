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

import { useI18n } from "@/hooks/use-i18n"
import { useOpenRouter } from "@/hooks/use-openrouter"
import { formatOpenRouterError } from "@/lib/i18n"
import { OPENROUTER_DASHBOARD_URL, beginOpenRouterAuth } from "@/lib/openrouter"
import { OpenRouterLogo } from "./openrouter-logo"

interface OpenRouterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OpenRouterDialog({
  open,
  onOpenChange,
}: OpenRouterDialogProps) {
  const { locale, t } = useI18n()
  const { status, keyInfo, infoError, disconnect } = useOpenRouter()
  const [redirecting, setRedirecting] = useState(false)

  const usd = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency: "USD",
  })

  const connect = () => {
    setRedirecting(true)
    void beginOpenRouterAuth().catch(() => setRedirecting(false))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" closeLabel={t.common.close}>
        <DialogHeader>
          <OpenRouterLogo className="size-4" />
          <DialogTitle>
            {status === "connected"
              ? t.openrouter.titleConnected
              : t.openrouter.titleConnect}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {status === "connected"
            ? t.openrouter.descriptionConnected
            : t.openrouter.descriptionConnect}
        </DialogDescription>

        {status === "loading" && (
          <div className="flex items-center justify-center py-6">
            <Spinner />
          </div>
        )}

        {status === "disconnected" && (
          <>
            <ol className="grid gap-3">
              {t.openrouter.steps.map((step, index) => (
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
              <AlertTitle>{t.openrouter.privacyTitle}</AlertTitle>
              <AlertDescription>{t.openrouter.privacyBody}</AlertDescription>
            </Alert>
          </>
        )}

        {status === "connected" && (
          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2.5">
              <div className="grid gap-0.5">
                <span className="font-medium">
                  {keyInfo?.label || t.openrouter.defaultKeyLabel}
                </span>
                <span className="text-xs text-muted-foreground">
                  {keyInfo
                    ? keyInfo.limit === null
                      ? t.openrouter.usageUncapped(usd.format(keyInfo.usage))
                      : t.openrouter.usageCapped(
                          usd.format(keyInfo.usage),
                          usd.format(keyInfo.limit)
                        )
                    : infoError
                      ? t.openrouter.usageUnavailable
                      : t.openrouter.usageChecking}
                </span>
              </div>
              <Badge variant="secondary" className="gap-1">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
                {t.openrouter.connectedBadge}
              </Badge>
            </div>

            {keyInfo?.isFreeTier && (
              <p className="text-xs text-muted-foreground">
                {t.openrouter.freeTierNote}
              </p>
            )}

            {infoError && (
              <Alert variant="destructive">
                <AlertTitle>{t.openrouter.keyCheckErrorTitle}</AlertTitle>
                <AlertDescription>
                  {formatOpenRouterError(t, infoError)}
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            <p className="text-xs text-muted-foreground">
              {t.openrouter.managePrefix}
              <a
                href={OPENROUTER_DASHBOARD_URL}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-3 hover:text-foreground"
              >
                {t.openrouter.dashboardLinkLabel}
              </a>
              {t.openrouter.manageSuffix}
            </p>
          </div>
        )}

        <DialogFooter>
          {status === "disconnected" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t.openrouter.notNow}
              </Button>
              <Button onClick={connect} disabled={redirecting}>
                {redirecting ? (
                  <Spinner />
                ) : (
                  <OpenRouterLogo className="size-3.5" />
                )}
                {redirecting ? t.openrouter.redirecting : t.openrouter.connect}
              </Button>
            </>
          )}
          {status === "connected" && (
            <>
              <Button variant="destructive" onClick={disconnect}>
                {t.openrouter.disconnect}
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
                {t.openrouter.openDashboard}
                <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} />
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
