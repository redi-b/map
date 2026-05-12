"use client"

import { CheckCircle2Icon, ClockIcon, FileImageIcon, Loader2Icon, UploadIcon, XCircleIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  createPrescription,
  listPrescriptionPharmacies,
  listPrescriptions,
  type Prescription,
  type PrescriptionPharmacy,
  type PrescriptionStatus,
} from "@/lib/api"

const statusConfig: Record<PrescriptionStatus, { label: string; icon: typeof ClockIcon; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  uploaded: { label: "Uploaded", icon: FileImageIcon, variant: "secondary" },
  under_review: { label: "Under review", icon: ClockIcon, variant: "secondary" },
  verified: { label: "Verified", icon: CheckCircle2Icon, variant: "default" },
  rejected: { label: "Rejected", icon: XCircleIcon, variant: "destructive" },
}

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [pharmacies, setPharmacies] = useState<PrescriptionPharmacy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showUpload, setShowUpload] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pharmacyId, setPharmacyId] = useState("")
  const [notes, setNotes] = useState("")
  const [isDelivery, setIsDelivery] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [proxyName, setProxyName] = useState("")
  const [proxyPhone, setProxyPhone] = useState("")
  const [uploading, setUploading] = useState(false)

  const selectedPharmacy = pharmacies.find((pharmacy) => pharmacy.id === pharmacyId)
  const deliveryUnavailable = selectedPharmacy ? !selectedPharmacy.supportsDelivery : false

  async function loadPageData() {
    setLoading(true)
    setError("")

    try {
      const [prescriptionsData, pharmaciesData] = await Promise.all([
        listPrescriptions(),
        listPrescriptionPharmacies(),
      ])
      setPrescriptions(prescriptionsData.prescriptions)
      setPharmacies(pharmaciesData.pharmacies)
      setPharmacyId((current) => current || pharmaciesData.pharmacies[0]?.id || "")
    } catch {
      setError("Unable to load prescriptions right now.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadPageData()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Upload a prescription image file.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Prescription image must be 5 MB or smaller.")
      return
    }

    setError("")
    setSelectedFile(file)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile) return

    setUploading(true)
    setError("")

    try {
      await createPrescription({
        pharmacyId,
        image: selectedFile,
        notes: notes.trim() || undefined,
        isDelivery,
        deliveryAddress: deliveryAddress.trim() || undefined,
        proxyName: proxyName.trim() || undefined,
        proxyPhone: proxyPhone.trim() || undefined,
      })
      setShowUpload(false)
      setSelectedFile(null)
      setNotes("")
      setIsDelivery(false)
      setDeliveryAddress("")
      setProxyName("")
      setProxyPhone("")
      await loadPageData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit prescription.")
    } finally {
      setUploading(false)
    }
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value))
  }

  return (
    <main className="grid gap-6 p-4 md:grid-cols-[1fr_22rem] md:p-6">
      {/* Prescriptions list */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-[var(--font-display)] text-xl font-semibold">Your prescriptions</h2>
          <Badge variant="secondary">{prescriptions.length} total</Badge>
        </div>

        {error && !showUpload ? <p className="text-sm text-destructive">{error}</p> : null}

        {loading ? (
          <Card>
            <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading prescriptions
            </CardContent>
          </Card>
        ) : null}

        {!loading && prescriptions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No prescriptions submitted yet.
            </CardContent>
          </Card>
        ) : null}

        {prescriptions.map((rx) => {
          const config = statusConfig[rx.status]
          const StatusIcon = config.icon

          return (
            <Card key={rx.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>Prescription {rx.id.slice(0, 8)}</CardTitle>
                  <CardDescription className="mt-1 flex items-center gap-2">
                    {rx.pharmacy}
                    <span className="text-muted-foreground">·</span>
                    {formatDate(rx.createdAt)}
                  </CardDescription>
                </div>
                <Badge variant={config.variant}>
                  <StatusIcon className="mr-1 size-3.5" />
                  {config.label}
                </Badge>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{rx.notes || "Submitted for pharmacy review"}</p>
                <div className="flex gap-1">
                  {rx.imageUrl ? (
                    <Badge variant="outline">
                      <FileImageIcon className="mr-1 size-3" />
                      Image stored
                    </Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      {/* Upload sidebar */}
      <div className="flex flex-col gap-4">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>New prescription</CardTitle>
            <CardDescription>
              Upload a clear image and choose pickup, proxy pickup, or delivery after review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showUpload ? (
              <Button className="w-full" onClick={() => setShowUpload(true)}>
                <UploadIcon data-icon="inline-start" />
                Upload prescription
              </Button>
            ) : (
              <form className="flex flex-col gap-4" onSubmit={handleUpload}>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Pharmacy
                  <select
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    value={pharmacyId}
                    onChange={(event) => {
                      const nextPharmacy = pharmacies.find((pharmacy) => pharmacy.id === event.target.value)
                      setPharmacyId(event.target.value)
                      if (nextPharmacy && !nextPharmacy.supportsDelivery) {
                        setIsDelivery(false)
                        setDeliveryAddress("")
                      }
                    }}
                    required
                  >
                    {pharmacies.map((pharmacy) => (
                      <option key={pharmacy.id} value={pharmacy.id}>
                        {pharmacy.name} - {pharmacy.neighborhood}
                      </option>
                    ))}
                  </select>
                </label>

                {/* File input */}
                <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-6 transition hover:border-primary">
                  <FileImageIcon className="size-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {selectedFile ? selectedFile.name : "Click to select prescription image"}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </label>

                {/* Notes */}
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Notes (optional)
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Allergies, urgency, etc."
                  />
                </label>

                {/* Collection method */}
                <fieldset className="flex flex-col gap-2">
                  <legend className="text-sm font-medium">Collection method</legend>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="collection"
                      checked={!isDelivery && !proxyName}
                      onChange={() => { setIsDelivery(false); setDeliveryAddress(""); setProxyName(""); setProxyPhone("") }}
                    />
                    Self pickup
                  </label>
                  <label className={`flex items-center gap-2 text-sm ${deliveryUnavailable ? "text-muted-foreground" : ""}`}>
                    <input
                      type="radio"
                      name="collection"
                      checked={isDelivery}
                      disabled={deliveryUnavailable}
                      onChange={() => { setIsDelivery(true); setProxyName(""); setProxyPhone("") }}
                    />
                    Delivery
                    {deliveryUnavailable ? <span className="text-xs">(not offered by this pharmacy)</span> : null}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="collection"
                      checked={!isDelivery && !!proxyName}
                      onChange={() => { setIsDelivery(false); setDeliveryAddress(""); setProxyName(" ") }}
                    />
                    Proxy pickup
                  </label>
                </fieldset>

                {isDelivery ? (
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Delivery address
                    <Input
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Street, building, or nearby landmark"
                      required
                    />
                  </label>
                ) : null}

                {/* Proxy fields */}
                {!isDelivery && proxyName ? (
                  <div className="flex flex-col gap-2 rounded-lg border bg-secondary/50 p-3">
                    <label className="flex flex-col gap-1 text-sm font-medium">
                      Proxy name
                      <Input
                        value={proxyName.trim()}
                        onChange={(e) => setProxyName(e.target.value)}
                        placeholder="Person collecting on your behalf"
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-medium">
                      Proxy phone
                      <Input
                        type="tel"
                        value={proxyPhone}
                        onChange={(e) => setProxyPhone(e.target.value)}
                        placeholder="+251XXXXXXXXX"
                      />
                    </label>
                  </div>
                ) : null}

                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                <Button type="submit" disabled={!selectedFile || !pharmacyId || uploading}>
                  {uploading ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : null}
                  Submit prescription
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowUpload(false)}>
                  Cancel
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Info card */}
        <Card className="h-fit bg-secondary/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Prescriptions are reviewed by the pharmacy within 1–2 hours during operating hours.
              You&apos;ll receive a notification when the review is complete.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
