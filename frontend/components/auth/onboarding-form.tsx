"use client"

import { CheckCircle2Icon, Loader2Icon, ShieldCheckIcon, UserRoundIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getCurrentUser, saveProfile } from "@/lib/api"
import { getRoleHomePath } from "@/lib/access"
import { cn } from "@/lib/utils"

export function OnboardingForm() {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true

    getCurrentUser()
      .then((currentUser) => {
        if (!active) return

        if (!currentUser) {
          router.replace("/login?next=/onboarding")
          return
        }

        if (currentUser.profile) {
          router.replace(getRoleHomePath(currentUser.profile.role))
          return
        }

        setFullName(currentUser.session.user.name ?? "")
      })
      .catch(() => setError("Unable to load your session"))
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [router])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")
    setFieldErrors({})

    try {
      await saveProfile({ fullName, phone, role: "patient" })
      router.replace(getRoleHomePath("patient"))
    } catch (err) {
      if (err instanceof Error && err.message.includes("details")) {
        try {
          const parsed = JSON.parse(err.message)
          if (parsed.details) {
            setFieldErrors(parsed.details)
            return
          }
        } catch {
          // Not a structured error — fall through
        }
      }
      setError("Unable to save profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2Icon className="size-5 animate-spin" />
        Loading onboarding
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <ShieldCheckIcon className="size-6" />
        </div>
        <h1 className="font-[var(--font-display)] text-3xl font-semibold">
          Welcome to MAP
        </h1>
        <p className="mt-2 text-muted-foreground">
          Complete your profile to start searching medicines and managing prescriptions.
        </p>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Your details</CardTitle>
          <CardDescription>
            This information helps pharmacies identify you when processing requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-5" onSubmit={onSubmit}>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Full name
              <Input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
                placeholder="Your full name"
                required
                minLength={2}
              />
              {fieldErrors.fullName ? (
                <p className="text-xs text-destructive">{fieldErrors.fullName[0]}</p>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium">
              Phone number
              <Input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                type="tel"
                autoComplete="tel"
                placeholder="+251XXXXXXXXX"
              />
              <p className="text-xs text-muted-foreground">
                Ethiopian format (+251...). Used for prescription follow-ups.
              </p>
              {fieldErrors.phone ? (
                <p className="text-xs text-destructive">{fieldErrors.phone[0]}</p>
              ) : null}
            </label>

            <div className="rounded-lg border bg-secondary/50 p-4">
              <div className="flex items-center gap-3">
                <UserRoundIcon className="size-5 text-primary" />
                <div>
                  <p className="font-medium">Care account</p>
                  <p className="text-sm text-muted-foreground">
                    Search medicines, upload prescriptions, and manage reminders.
                  </p>
                </div>
              </div>
            </div>

            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-primary" />
              Additional workspace access appears here after approval.
            </p>

            {error ? (
              <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" size="lg" disabled={saving}>
              {saving ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : null}
              Complete setup
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
