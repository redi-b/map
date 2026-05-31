"use client"

import {
  Building2Icon,
  CheckCircle2Icon,
  KeyRoundIcon,
  Loader2Icon,
  MapPinIcon,
  PhoneIcon,
  ShieldCheckIcon,
  TruckIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { type FormEvent, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  completePharmacyPasswordSetup,
  getCurrentUser,
  getPharmacySetup,
  updatePharmacySetupLocation,
  type PharmacySetupPharmacy,
} from "@/lib/api"

function branchLabel(pharmacy: PharmacySetupPharmacy) {
  return [pharmacy.name, pharmacy.branchName].filter(Boolean).join(" - ")
}

export default function PharmacySetupPage() {
  const router = useRouter()
  const [assignedPharmacy, setAssignedPharmacy] = useState<PharmacySetupPharmacy | null>(null)
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingLocation, setSavingLocation] = useState(false)
  const [capturingLocation, setCapturingLocation] = useState(false)
  const [error, setError] = useState("")
  const [locationError, setLocationError] = useState("")

  useEffect(() => {
    let active = true

    Promise.all([getCurrentUser(), getPharmacySetup()])
      .then(([currentUser, setup]) => {
        if (!active) return
        setMustChangePassword(Boolean(currentUser?.profile?.mustChangePassword))
        setAssignedPharmacy(setup.assignedPharmacy)
        setLatitude(setup.assignedPharmacy?.latitude?.toString() ?? "")
        setLongitude(setup.assignedPharmacy?.longitude?.toString() ?? "")
      })
      .catch(() => {
        if (active) setError("Unable to load security setup.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setSaving(true)

    try {
      await completePharmacyPasswordSetup({ currentPassword, newPassword })
      setMustChangePassword(false)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      router.replace("/dashboard")
      router.refresh()
    } catch {
      setError("Unable to change password. Check the temporary password and try again.")
    } finally {
      setSaving(false)
    }
  }

  function captureCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Location capture is not available in this browser.")
      return
    }

    setCapturingLocation(true)
    setLocationError("")

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(7))
        setLongitude(position.coords.longitude.toFixed(7))
        setCapturingLocation(false)
      },
      () => {
        setLocationError("Unable to read current location. Enter coordinates manually.")
        setCapturingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  async function saveLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocationError("")

    const nextLatitude = Number(latitude)
    const nextLongitude = Number(longitude)

    if (!Number.isFinite(nextLatitude) || !Number.isFinite(nextLongitude)) {
      setLocationError("Enter valid latitude and longitude values.")
      return
    }

    setSavingLocation(true)

    try {
      const setup = await updatePharmacySetupLocation({
        latitude: nextLatitude,
        longitude: nextLongitude,
      })
      setAssignedPharmacy(setup.assignedPharmacy)
      setLatitude(setup.assignedPharmacy?.latitude?.toString() ?? "")
      setLongitude(setup.assignedPharmacy?.longitude?.toString() ?? "")
    } catch {
      setLocationError("Unable to update pharmacy location.")
    } finally {
      setSavingLocation(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
          Loading setup
        </div>
      </main>
    )
  }

  return (
    <main className="grid gap-6 p-4 lg:grid-cols-[0.48fr_0.52fr] md:p-6">
      <section className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Secure your account</CardTitle>
            <CardDescription>
              Set a private password before using pharmacy tools.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {mustChangePassword ? (
              <form className="grid gap-4" onSubmit={onSubmit}>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Temporary password
                  <Input
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  New password
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    minLength={8}
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Confirm new password
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={8}
                    required
                  />
                </label>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <KeyRoundIcon data-icon="inline-start" />}
                  Change password
                </Button>
              </form>
            ) : (
              <div className="rounded-lg border bg-secondary/40 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2Icon className="mt-0.5 size-5 text-primary" />
                  <div>
                    <p className="font-medium">Security setup complete</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      You can use inventory and request tools for your assigned pharmacy.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        {assignedPharmacy ? (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{branchLabel(assignedPharmacy)}</CardTitle>
                  <CardDescription>{assignedPharmacy.licenseNumber}</CardDescription>
                </div>
                <Badge variant={assignedPharmacy.isVerified ? "default" : "secondary"}>
                  {assignedPharmacy.isVerified ? "Verified" : "Pending"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPinIcon className="size-4" />
                {assignedPharmacy.neighborhood}, {assignedPharmacy.address}
              </div>
              <form className="grid gap-3 rounded-lg border bg-secondary/40 p-3" onSubmit={saveLocation}>
                <div>
                  <p className="font-medium text-foreground">Branch location</p>
                  <p className="text-xs text-muted-foreground">
                    {assignedPharmacy.latitude !== null && assignedPharmacy.longitude !== null
                      ? `${assignedPharmacy.latitude.toFixed(5)}, ${assignedPharmacy.longitude.toFixed(5)}`
                      : "Coordinates not set"}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    type="number"
                    step="0.0000001"
                    min="-90"
                    max="90"
                    placeholder="Latitude"
                    value={latitude}
                    onChange={(event) => setLatitude(event.target.value)}
                    required
                  />
                  <Input
                    type="number"
                    step="0.0000001"
                    min="-180"
                    max="180"
                    placeholder="Longitude"
                    value={longitude}
                    onChange={(event) => setLongitude(event.target.value)}
                    required
                  />
                </div>
                {locationError ? <p className="text-xs text-destructive">{locationError}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={captureCurrentLocation} disabled={capturingLocation || savingLocation}>
                    {capturingLocation ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <MapPinIcon data-icon="inline-start" />}
                    Use current
                  </Button>
                  <Button type="submit" size="sm" disabled={savingLocation}>
                    {savingLocation ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : null}
                    Save location
                  </Button>
                </div>
              </form>
              <div className="flex items-center gap-2 text-muted-foreground">
                <PhoneIcon className="size-4" />
                {assignedPharmacy.phone}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <TruckIcon className="size-4" />
                {assignedPharmacy.supportsDelivery ? "Delivery supported" : "Pickup only"}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldCheckIcon className="size-4" />
                Assigned by operations
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
              <Building2Icon className="size-10" />
              <p className="text-sm">No branch has been assigned to this account yet.</p>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  )
}
