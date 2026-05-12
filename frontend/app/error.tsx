"use client"

import { AlertTriangleIcon, RotateCcwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="size-5 text-destructive" />
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            The page could not finish loading. Try again, or return to the dashboard after refreshing.
          </p>
          <Button onClick={reset}>
            <RotateCcwIcon data-icon="inline-start" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
