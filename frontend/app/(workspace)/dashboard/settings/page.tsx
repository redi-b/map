"use client"

import { Building2Icon, CheckCircle2Icon, KeyRoundIcon, Loader2Icon, MailIcon, PhoneIcon, ShieldCheckIcon, UserRoundIcon } from "lucide-react"
import { type FormEvent, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  changeAccountPassword,
  getCurrentUser,
  getPharmacySetup,
  saveProfile,
  type CurrentUser,
  type PharmacySetupPharmacy,
} from "@/lib/api"
import { getAccountLabel } from "@/lib/access"
import { toast } from "@/lib/toast"

function pharmacyLabel(pharmacy: PharmacySetupPharmacy) {
  return [pharmacy.name, pharmacy.branchName].filter(Boolean).join(" - ")
}

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [pharmacy, setPharmacy] = useState<PharmacySetupPharmacy | null>(null)
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [error, setError] = useState("")

  const role = currentUser?.profile?.role ?? "patient"
  const initials = useMemo(() => {
    const source = fullName || currentUser?.session.user.email || "MAP"
    return source.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
  }, [currentUser, fullName])

  useEffect(() => {
    let active = true

    getCurrentUser()
      .then(async (user) => {
        if (!active || !user?.profile) return
        setCurrentUser(user)
        setFullName(user.profile.fullName)
        setPhone(user.profile.phone ?? "")

        if (user.profile.role === "pharmacist") {
          const setup = await getPharmacySetup()
          if (active) setPharmacy(setup.assignedPharmacy)
        }
      })
      .catch(() => setError("Unable to load settings."))
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function onProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!currentUser?.profile) return

    setSavingProfile(true)
    setError("")

    try {
      const updated = await saveProfile({ fullName, phone, role: currentUser.profile.role })
      setCurrentUser((user) => user ? { ...user, profile: updated } : user)
      toast.success("Profile updated", "Your details have been saved.")
    } catch {
      setError("Unable to update profile. Check the fields and try again.")
      toast.error("Profile not updated", "Check the fields and try again.")
    } finally {
      setSavingProfile(false)
    }
  }

  async function onPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setSavingPassword(true)

    try {
      await changeAccountPassword({ currentPassword, newPassword })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setCurrentUser((user) => user?.profile ? { ...user, profile: { ...user.profile, mustChangePassword: false } } : user)
      toast.success("Password changed", "Your account security has been updated.")
    } catch {
      setError("Unable to change password. Check the current password and try again.")
      toast.error("Password not changed", "Check the current password and try again.")
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
          Loading settings
        </div>
      </main>
    )
  }

  return (
    <main>
      <Tabs defaultValue="profile" orientation="vertical" className="grid gap-6 p-4 lg:grid-cols-[18rem_1fr] md:p-6">
        <aside className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{fullName}</p>
                <p className="truncate text-sm text-muted-foreground">{currentUser?.session.user.email}</p>
              </div>
            </CardContent>
          </Card>

          <TabsList className="w-full items-stretch rounded-lg border bg-card p-1" aria-label="Settings sections">
            {([
              ["profile", UserRoundIcon, "Profile"],
              ["workspace", Building2Icon, "Workspace"],
              ["security", KeyRoundIcon, "Security"],
            ] as const).map(([value, Icon, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="justify-start px-3 py-2"
              >
                <Icon data-icon="inline-start" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </aside>

        <section className="flex flex-col gap-4">
          {error ? <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

        <TabsContent value="profile">
          <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
            <Card className="overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-primary/25 via-primary/10 to-transparent" />
              <CardContent className="-mt-10 flex flex-col gap-4 p-6">
                <div className="flex items-end justify-between gap-3">
                  <div className="flex size-20 items-center justify-center rounded-2xl border-4 border-background bg-primary text-2xl font-semibold text-primary-foreground shadow-sm">
                    {initials}
                  </div>
                  <Badge variant="secondary">{getAccountLabel(role)}</Badge>
                </div>
                <div>
                  <h2 className="font-[var(--font-display)] text-2xl font-semibold">{fullName || "Your profile"}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">This is the identity pharmacies and care tools use for follow-up.</p>
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                    <MailIcon className="size-4 text-muted-foreground" />
                    <span className="truncate">{currentUser?.session.user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                    <PhoneIcon className="size-4 text-muted-foreground" />
                    <span>{phone || "No phone number added"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profile details</CardTitle>
                <CardDescription>Keep contact details accurate for pharmacy follow-up and account recovery.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4" onSubmit={onProfileSubmit}>
                  <label className="grid gap-2 text-sm font-medium">
                    Full name
                    <Input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" required />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Phone
                    <Input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" autoComplete="tel" placeholder="+251XXXXXXXXX" />
                  </label>
                  <div className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
                    <ShieldCheckIcon className="size-4 text-primary" />
                    Role changes are managed by administrators. You can update your name and phone here.
                  </div>
                  <Button type="submit" className="w-fit" disabled={savingProfile}>
                    {savingProfile ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <CheckCircle2Icon data-icon="inline-start" />}
                    Save profile
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workspace">
          <Card>
            <CardHeader>
              <CardTitle>{role === "pharmacist" ? "Pharmacy workspace" : role === "admin" ? "Operations workspace" : "Personal workspace"}</CardTitle>
              <CardDescription>Workspace access is based on your assigned role.</CardDescription>
            </CardHeader>
            <CardContent>
              {role === "pharmacist" && pharmacy ? (
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <span className="text-xs text-muted-foreground">Pharmacy</span>
                    <p className="font-medium">{pharmacyLabel(pharmacy)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <span className="text-xs text-muted-foreground">License</span>
                    <p className="font-medium">{pharmacy.licenseNumber}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <span className="text-xs text-muted-foreground">Address</span>
                    <p className="font-medium">{pharmacy.neighborhood}, {pharmacy.address}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <p className="font-medium">{pharmacy.isVerified ? "Verified" : "Pending verification"}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <ShieldCheckIcon className="mt-0.5 size-5 text-primary" />
                  <div>
                    <p className="font-medium">{getAccountLabel(role)}</p>
                    <p className="text-sm text-muted-foreground">No extra workspace setup is needed for this account.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Change your password regularly to keep your account secure.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:max-w-xl" onSubmit={onPasswordSubmit}>
                {currentUser?.profile?.mustChangePassword ? <Badge className="w-fit">Password setup required</Badge> : null}
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Use at least 8 characters. Avoid reusing passwords from other health or email accounts.
                </div>
                <label className="grid gap-2 text-sm font-medium">
                  Current password
                  <Input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  New password
                  <Input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Confirm new password
                  <Input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required />
                </label>
                <Button type="submit" className="w-fit" disabled={savingPassword}>
                  {savingPassword ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <KeyRoundIcon data-icon="inline-start" />}
                  Change password
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        </section>
      </Tabs>
    </main>
  )
}
