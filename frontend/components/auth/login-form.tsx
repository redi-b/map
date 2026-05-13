"use client"

import { Loader2Icon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getCurrentUser } from "@/lib/api"
import { getRoleHomePath } from "@/lib/access"
import { authClient } from "@/lib/auth-client"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")

    const result = await authClient.signIn.email({ email, password })
    setLoading(false)

    if (result.error) {
      setError(result.error.message ?? "Unable to sign in")
      return
    }

    const currentUser = await getCurrentUser()

    if (!currentUser?.profile) {
      router.replace("/onboarding")
      return
    }

    if (currentUser.profile.mustChangePassword && currentUser.profile.role === "pharmacist") {
      router.replace("/dashboard/pharmacy/setup")
      return
    }

    router.replace(searchParams.get("next") ?? getRoleHomePath(currentUser.profile.role))
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="font-[var(--font-display)] text-2xl">Sign in</CardTitle>
        <CardDescription>
          Continue to medicine searches, prescription replies, and reminder tools.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Email
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Password
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
            />
          </label>
          {error ? (
            <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : null}
            Sign in
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
