"use client"

import { Loader2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getCurrentUser, saveProfile, type UserRole } from "@/lib/api"
import { getRoleHomePath } from "@/lib/access"
import { cn } from "@/lib/utils"

const roles: Array<{ value: UserRole; label: string; description: string }> = [
  { value: "patient", label: "Patient or caregiver", description: "Search medicine, upload prescriptions, and manage reminders." },
  { value: "pharmacist", label: "Pharmacy", description: "Manage availability and respond to prescription requests." },
]

export function OnboardingForm() {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<UserRole>("patient")
  const [error, setError] = useState("")
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

    try {
      await saveProfile({ fullName, phone, role })
      router.replace(getRoleHomePath(role))
    } catch {
      setError("Unable to save profile")
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
    <Card>
      <CardHeader>
        <CardTitle>Set up your MAP account</CardTitle>
        <CardDescription>Choose how you plan to use MAP.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-5" onSubmit={onSubmit}>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Full name
            <Input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Phone
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            {roles.map((item) => (
              <button
                key={item.value}
                type="button"
                className={cn(
                  "rounded-lg border bg-card p-4 text-left transition hover:bg-accent",
                  role === item.value && "border-primary bg-secondary"
                )}
                onClick={() => setRole(item.value)}
              >
                <span className="font-semibold">{item.label}</span>
                <span className="mt-2 block text-sm text-muted-foreground">{item.description}</span>
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">MAP staff access is assigned separately.</p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : null}
            Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
