"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Spinner } from "@workspace/ui/components/spinner"

import { useI18n } from "@/hooks/use-i18n"
import { formatOpenRouterError, type Messages } from "@/lib/i18n"
import {
  beginOpenRouterAuth,
  completeOpenRouterAuth,
  type OpenRouterAuthError,
} from "@/lib/openrouter"
import { OpenRouterLogo } from "@/components/openrouter/openrouter-logo"

type CallbackState =
  | { phase: "exchanging" }
  | { phase: "success" }
  | { phase: "error"; error: OpenRouterAuthError | "missing-code" }

const errorMessage = (
  t: Messages,
  error: OpenRouterAuthError | "missing-code"
) =>
  error === "missing-code"
    ? t.errors.missingCode
    : formatOpenRouterError(t, error)

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const code = searchParams.get("code")
  const [state, setState] = useState<CallbackState>(() =>
    code ? { phase: "exchanging" } : { phase: "error", error: "missing-code" }
  )
  // The authorization code is single-use; guard against React strict mode
  // running the effect twice.
  const startedRef = useRef(false)

  useEffect(() => {
    if (!code || startedRef.current) return
    startedRef.current = true

    void completeOpenRouterAuth(code).then((result) =>
      result.match({
        ok: () => {
          setState({ phase: "success" })
          setTimeout(() => router.replace("/"), 1500)
        },
        err: (error) => setState({ phase: "error", error }),
      })
    )
  }, [code, router])

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="flex size-10 items-center justify-center rounded-lg bg-foreground text-background">
          <OpenRouterLogo className="size-5" />
        </div>
        <CardTitle>
          {state.phase === "success"
            ? t.callback.titleSuccess
            : state.phase === "error"
              ? t.callback.titleError
              : t.callback.titleConnecting}
        </CardTitle>
        <CardDescription>
          {state.phase === "success"
            ? t.callback.descriptionSuccess
            : state.phase === "error"
              ? t.callback.descriptionError
              : t.callback.descriptionConnecting}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state.phase === "exchanging" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Spinner />
            {t.callback.exchanging}
          </div>
        )}
        {state.phase === "success" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              strokeWidth={2}
              className="text-emerald-500"
            />
            {t.callback.success}
          </div>
        )}
        {state.phase === "error" && (
          <Alert variant="destructive">
            <AlertTitle>{t.callback.errorTitle}</AlertTitle>
            <AlertDescription>{errorMessage(t, state.error)}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        {state.phase === "error" ? (
          <>
            <Button variant="outline" onClick={() => router.replace("/")}>
              {t.callback.backToMap}
            </Button>
            <Button onClick={() => void beginOpenRouterAuth()}>
              <OpenRouterLogo className="size-3.5" />
              {t.callback.tryAgain}
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            onClick={() => router.replace("/")}
            disabled={state.phase === "exchanging"}
          >
            {t.callback.backToMap}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

function CallbackFallback() {
  const { t } = useI18n()
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Spinner />
      {t.callback.loadingFallback}
    </div>
  )
}

export default function OpenRouterCallbackPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <Suspense fallback={<CallbackFallback />}>
        <CallbackContent />
      </Suspense>
    </main>
  )
}
