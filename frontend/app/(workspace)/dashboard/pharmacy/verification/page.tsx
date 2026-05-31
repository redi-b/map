"use client"

import {
  Building2Icon,
  CheckCircle2Icon,
  Loader2Icon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  ShieldCheckIcon,
  TruckIcon,
  XCircleIcon,
} from "lucide-react"
import { type FormEvent, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  createAdminPharmacy,
  listAdminPharmacies,
  verifyAdminPharmacy,
  type AdminPharmacy,
} from "@/lib/api"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

type Filter = "all" | "verified" | "pending"

type PharmacyForm = {
  name: string
  branchName: string
  neighborhood: string
  address: string
  licenseNumber: string
  phone: string
  email: string
  operatingHours: string
  latitude: string
  longitude: string
  supportsDelivery: boolean
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone: string
}

const emptyForm: PharmacyForm = {
  name: "",
  branchName: "",
  neighborhood: "",
  address: "",
  licenseNumber: "",
  phone: "",
  email: "",
  operatingHours: "",
  latitude: "",
  longitude: "",
  supportsDelivery: false,
  primaryContactName: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
}

type CreatedCredentials = {
  pharmacyName: string
  fullName: string
  email: string
  initialPassword: string
}

function branchLabel(pharmacy: AdminPharmacy) {
  return [pharmacy.name, pharmacy.branchName].filter(Boolean).join(" - ")
}

export default function PharmacyVerificationPage() {
  const [pharmacies, setPharmacies] = useState<AdminPharmacy[]>([])
  const [filter, setFilter] = useState<Filter>("all")
  const [showRegister, setShowRegister] = useState(false)
  const [form, setForm] = useState<PharmacyForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [capturingLocation, setCapturingLocation] = useState(false)
  const [updatingId, setUpdatingId] = useState("")
  const [error, setError] = useState("")
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null)

  const filtered = useMemo(() => {
    return pharmacies.filter((pharmacy) => {
      if (filter === "verified") return pharmacy.isVerified
      if (filter === "pending") return !pharmacy.isVerified
      return true
    })
  }, [filter, pharmacies])

  const verifiedCount = pharmacies.filter((pharmacy) => pharmacy.isVerified).length
  const pendingCount = pharmacies.length - verifiedCount
  const deliveryCount = pharmacies.filter((pharmacy) => pharmacy.supportsDelivery).length

  async function loadPharmacies() {
    setLoading(true)
    setError("")

    try {
      const data = await listAdminPharmacies()
      setPharmacies(data.pharmacies)
    } catch {
      setError("Unable to load pharmacy registry.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadPharmacies()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [])

  function updateForm<K extends keyof PharmacyForm>(key: K, value: PharmacyForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function captureCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Location capture is not available in this browser.")
      return
    }

    setCapturingLocation(true)
    setError("")

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateForm("latitude", position.coords.latitude.toFixed(7))
        updateForm("longitude", position.coords.longitude.toFixed(7))
        setCapturingLocation(false)
      },
      () => {
        setError("Unable to read current location. Enter coordinates manually.")
        setCapturingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  async function toggleVerify(pharmacy: AdminPharmacy) {
    setUpdatingId(pharmacy.id)
    setError("")

    try {
      const updated = await verifyAdminPharmacy(pharmacy.id, !pharmacy.isVerified)
      setPharmacies((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      toast.success(updated.isVerified ? "Pharmacy verified" : "Verification removed", branchLabel(updated))
    } catch {
      setError("Unable to update pharmacy verification.")
      toast.error("Verification not updated", "Try again in a moment.")
    } finally {
      setUpdatingId("")
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")

    try {
      const result = await createAdminPharmacy({
        name: form.name.trim(),
        branchName: form.branchName.trim() || undefined,
        neighborhood: form.neighborhood.trim(),
        address: form.address.trim(),
        licenseNumber: form.licenseNumber.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        operatingHours: form.operatingHours.trim() || undefined,
        supportsDelivery: form.supportsDelivery,
        primaryContactName: form.primaryContactName.trim(),
        primaryContactEmail: form.primaryContactEmail.trim(),
        primaryContactPhone: form.primaryContactPhone.trim() || undefined,
      })

      setPharmacies((current) => [result.pharmacy, ...current])
      setCreatedCredentials({
        pharmacyName: branchLabel(result.pharmacy),
        fullName: result.primaryUser.fullName,
        email: result.primaryUser.email,
        initialPassword: result.primaryUser.initialPassword,
      })
      setForm(emptyForm)
      setShowRegister(false)
      toast.action("Pharmacy registered", "Copy the primary pharmacist login before leaving this page.", {
        title: "Copy login",
        onClick: () => {
          void navigator.clipboard.writeText(`${result.primaryUser.email} / ${result.primaryUser.initialPassword}`)
        },
      })
    } catch {
      setError("Unable to register pharmacy. Check the required fields and try again.")
      toast.error("Pharmacy not registered", "Check the required fields and try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>{pharmacies.length}</CardTitle>
            <CardDescription>Total pharmacies</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{verifiedCount}</CardTitle>
            <CardDescription>Verified</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{pendingCount}</CardTitle>
            <CardDescription>Pending review</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{deliveryCount}</CardTitle>
            <CardDescription>Delivery enabled</CardDescription>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Pharmacy registry</CardTitle>
            <CardDescription>Register branches and control which pharmacies appear to patients.</CardDescription>
          </div>
          <Button onClick={() => setShowRegister((value) => !value)}>
            <PlusIcon data-icon="inline-start" />
            Register pharmacy
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {(["all", "verified", "pending"] as const).map((item) => (
                <Button
                  key={item}
                  variant={filter === item ? "secondary" : "outline"}
                  size="sm"
                  className={cn(filter === item && "border-primary/60 bg-primary/15 text-primary shadow-[inset_0_0_0_1px_var(--primary)] hover:bg-primary/20 dark:bg-primary/20 dark:text-foreground")}
                  onClick={() => setFilter(item)}
                >
                  {item === "all" ? "All" : item === "verified" ? "Verified" : "Pending"}
                </Button>
              ))}
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          {showRegister ? (
            <form onSubmit={handleRegister} className="grid gap-4 rounded-lg border bg-secondary/40 p-4">
              <div>
                <p className="font-medium">Register a pharmacy</p>
                <p className="text-sm text-muted-foreground">
                  New branches stay hidden from patients until verified. A pharmacist login is created with a temporary password.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Pharmacy name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} required />
                <Input placeholder="Branch name" value={form.branchName} onChange={(event) => updateForm("branchName", event.target.value)} />
                <Input placeholder="Neighborhood" value={form.neighborhood} onChange={(event) => updateForm("neighborhood", event.target.value)} required />
                <Input placeholder="Street address" value={form.address} onChange={(event) => updateForm("address", event.target.value)} required />
                <Input placeholder="License number" value={form.licenseNumber} onChange={(event) => updateForm("licenseNumber", event.target.value)} required />
                <Input placeholder="Phone (+251...)" value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} required />
                <Input placeholder="Email" type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} />
                <Input placeholder="Operating hours" value={form.operatingHours} onChange={(event) => updateForm("operatingHours", event.target.value)} />
              </div>
              <div className="grid gap-3 rounded-md border bg-background p-3 md:grid-cols-[1fr_1fr_auto]">
                <Input
                  type="number"
                  step="0.0000001"
                  min="-90"
                  max="90"
                  placeholder="Latitude"
                  value={form.latitude}
                  onChange={(event) => updateForm("latitude", event.target.value)}
                />
                <Input
                  type="number"
                  step="0.0000001"
                  min="-180"
                  max="180"
                  placeholder="Longitude"
                  value={form.longitude}
                  onChange={(event) => updateForm("longitude", event.target.value)}
                />
                <Button type="button" variant="outline" onClick={captureCurrentLocation} disabled={capturingLocation}>
                  {capturingLocation ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <MapPinIcon data-icon="inline-start" />}
                  Use current
                </Button>
              </div>
              <div className="grid gap-3 rounded-md border bg-background p-3 md:grid-cols-3">
                <Input
                  placeholder="Primary pharmacist name"
                  value={form.primaryContactName}
                  onChange={(event) => updateForm("primaryContactName", event.target.value)}
                  required
                />
                <Input
                  placeholder="Login email"
                  type="email"
                  value={form.primaryContactEmail}
                  onChange={(event) => updateForm("primaryContactEmail", event.target.value)}
                  required
                />
                <Input
                  placeholder="Contact phone"
                  value={form.primaryContactPhone}
                  onChange={(event) => updateForm("primaryContactPhone", event.target.value)}
                />
              </div>
              <label className="flex items-center justify-between gap-4 rounded-md border bg-background p-3 text-sm font-medium">
                <span className="flex items-center gap-2">
                  <TruckIcon className="size-4 text-muted-foreground" />
                  Delivery available
                </span>
                <Switch
                  checked={form.supportsDelivery}
                  onCheckedChange={(checked) => updateForm("supportsDelivery", checked)}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon data-icon="inline-start" />}
                  Register
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowRegister(false)} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}

          {createdCredentials ? (
            <div className="grid gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
              <div>
                <p className="font-medium">Pharmacist login created</p>
                <p className="text-muted-foreground">
                  Share these details with {createdCredentials.fullName}. They will be asked to change the password on first login.
                </p>
              </div>
              <div className="grid gap-2 rounded-md bg-background p-3 sm:grid-cols-3">
                <span>
                  <span className="block text-xs text-muted-foreground">Pharmacy</span>
                  {createdCredentials.pharmacyName}
                </span>
                <span>
                  <span className="block text-xs text-muted-foreground">Email</span>
                  {createdCredentials.email}
                </span>
                <span>
                  <span className="block text-xs text-muted-foreground">Temporary password</span>
                  <code className="font-mono text-xs">{createdCredentials.initialPassword}</code>
                </span>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center gap-3 rounded-lg border p-4 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading pharmacies
            </div>
          ) : null}

          {!loading && filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              {filter === "all" ? "No pharmacies have been registered yet." : `No ${filter} pharmacies found.`}
            </div>
          ) : null}

          {filtered.map((pharmacy) => (
            <div key={pharmacy.id} className="grid gap-4 rounded-lg border p-4 lg:grid-cols-[1fr_auto]">
              <div className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <Building2Icon className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{branchLabel(pharmacy)}</h3>
                    <Badge variant={pharmacy.isVerified ? "default" : "secondary"}>
                      {pharmacy.isVerified ? "Verified" : "Pending"}
                    </Badge>
                    {pharmacy.supportsDelivery ? (
                      <Badge variant="outline">
                        <TruckIcon className="mr-1 size-3" />
                        Delivery
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                    <span className="flex items-center gap-2">
                      <MapPinIcon className="size-3.5" />
                      {pharmacy.neighborhood}, {pharmacy.address}
                    </span>
                    <span className="flex items-center gap-2">
                      <MapPinIcon className="size-3.5" />
                      {pharmacy.latitude !== null && pharmacy.longitude !== null ? `${pharmacy.latitude.toFixed(5)}, ${pharmacy.longitude.toFixed(5)}` : "Coordinates not set"}
                    </span>
                    <span className="flex items-center gap-2">
                      <ShieldCheckIcon className="size-3.5" />
                      {pharmacy.licenseNumber}
                    </span>
                    <span className="flex items-center gap-2">
                      <PhoneIcon className="size-3.5" />
                      {pharmacy.phone}
                    </span>
                    {pharmacy.email ? (
                      <span className="flex items-center gap-2">
                        <MailIcon className="size-3.5" />
                        {pharmacy.email}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 lg:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleVerify(pharmacy)}
                  disabled={updatingId === pharmacy.id}
                >
                  {updatingId === pharmacy.id ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : pharmacy.isVerified ? (
                    <XCircleIcon data-icon="inline-start" />
                  ) : (
                    <CheckCircle2Icon data-icon="inline-start" />
                  )}
                  {pharmacy.isVerified ? "Revoke" : "Verify"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  )
}
