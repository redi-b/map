"use client"

import {
  Building2Icon,
  CheckCircle2Icon,
  Loader2Icon,
  MapPinIcon,
  PhoneIcon,
  ShieldCheckIcon,
  TruckIcon,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  assignPharmacy,
  getPharmacySetup,
  type PharmacySetupPharmacy,
} from "@/lib/api"

function branchLabel(pharmacy: PharmacySetupPharmacy) {
  return [pharmacy.name, pharmacy.branchName].filter(Boolean).join(" - ")
}

export default function PharmacySetupPage() {
  const [assignedPharmacy, setAssignedPharmacy] = useState<PharmacySetupPharmacy | null>(null)
  const [pharmacies, setPharmacies] = useState<PharmacySetupPharmacy[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const selectedPharmacy = useMemo(
    () => pharmacies.find((pharmacy) => pharmacy.id === selectedId) ?? null,
    [pharmacies, selectedId],
  )

  useEffect(() => {
    let active = true

    getPharmacySetup()
      .then((state) => {
        if (!active) return
        setAssignedPharmacy(state.assignedPharmacy)
        setPharmacies(state.pharmacies)
        setSelectedId(state.assignedPharmacy?.id ?? state.pharmacies[0]?.id ?? "")
      })
      .catch(() => {
        if (active) setError("Unable to load registered pharmacies.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function saveBranch() {
    if (!selectedId) return

    setSaving(true)
    setError("")

    try {
      const state = await assignPharmacy(selectedId)
      setAssignedPharmacy(state.assignedPharmacy)
      setPharmacies(state.pharmacies)
    } catch {
      setError("Unable to connect this branch.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
          Loading branch setup
        </div>
      </main>
    )
  }

  return (
    <main className="grid gap-6 p-4 lg:grid-cols-[0.45fr_0.55fr] md:p-6">
      <section className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Branch setup</CardTitle>
            <CardDescription>
              Connect this account to the pharmacy branch you manage.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {assignedPharmacy ? (
              <div className="rounded-lg border bg-secondary/40 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-background">
                    <CheckCircle2Icon className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{branchLabel(assignedPharmacy)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {assignedPharmacy.neighborhood}, {assignedPharmacy.address}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No branch is connected yet.
              </div>
            )}

            <label className="flex flex-col gap-2 text-sm font-medium">
              Registered branch
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
              >
                {pharmacies.map((pharmacy) => (
                  <option key={pharmacy.id} value={pharmacy.id}>
                    {branchLabel(pharmacy)} - {pharmacy.neighborhood}
                  </option>
                ))}
              </select>
            </label>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button onClick={saveBranch} disabled={!selectedId || saving}>
              {saving ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <ShieldCheckIcon data-icon="inline-start" />}
              {assignedPharmacy ? "Update branch" : "Connect branch"}
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        {selectedPharmacy ? (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{branchLabel(selectedPharmacy)}</CardTitle>
                  <CardDescription>{selectedPharmacy.licenseNumber}</CardDescription>
                </div>
                <Badge variant={selectedPharmacy.isVerified ? "default" : "secondary"}>
                  {selectedPharmacy.isVerified ? "Verified" : "Pending"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPinIcon className="size-4" />
                {selectedPharmacy.neighborhood}, {selectedPharmacy.address}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <PhoneIcon className="size-4" />
                {selectedPharmacy.phone}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <TruckIcon className="size-4" />
                {selectedPharmacy.supportsDelivery ? "Delivery supported" : "Pickup only"}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
              <Building2Icon className="size-10" />
              <p className="text-sm">No registered pharmacies are available yet.</p>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  )
}
