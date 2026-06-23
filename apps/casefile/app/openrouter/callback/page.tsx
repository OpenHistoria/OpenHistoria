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

import { formatOpenRouterError } from "@/lib/errors"
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

const errorMessage = (error: OpenRouterAuthError | "missing-code") =>
  error === "missing-code"
    ? "No authorization code was returned. Start the connection again."
    : formatOpenRouterError(error)

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
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
            ? "Connected"
            : state.phase === "error"
              ? "Connection failed"
              : "Connecting to OpenRouter"}
        </CardTitle>
        <CardDescription>
          {state.phase === "success"
            ? "Your account is linked. Returning to your cases..."
            : state.phase === "error"
              ? "We could not finish linking your OpenRouter account."
              : "Finishing the secure handshake with OpenRouter."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state.phase === "exchanging" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Spinner />
            Exchanging authorization code...
          </div>
        )}
        {state.phase === "success" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              strokeWidth={2}
              className="text-emerald-500"
            />
            Key stored in this browser.
          </div>
        )}
        {state.phase === "error" && (
          <Alert variant="destructive">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{errorMessage(state.error)}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        {state.phase === "error" ? (
          <>
            <Button variant="outline" onClick={() => router.replace("/")}>
              Back
            </Button>
            <Button onClick={() => void beginOpenRouterAuth()}>
              <OpenRouterLogo className="size-3.5" />
              Try again
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            onClick={() => router.replace("/")}
            disabled={state.phase === "exchanging"}
          >
            Back
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

function CallbackFallback() {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Spinner />
      Loading...
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
