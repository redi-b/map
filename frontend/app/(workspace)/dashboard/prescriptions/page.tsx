"use client"

import { CheckCircle2Icon, ClockIcon, FileImageIcon, Loader2Icon, PackageSearchIcon, UploadIcon, XCircleIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PrescriptionImage } from "@/components/map/prescription-image"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  createPrescription,
  getApiUrl,
  listPatientAvailabilityRequests,
  listPrescriptionPharmacies,
  listPrescriptions,
  type PatientAvailabilityRequest,
  type Prescription,
  type PrescriptionPharmacy,
  type PrescriptionStatus,
} from "@/lib/api"
import { toast } from "@/lib/toast"

const statusConfig: Record<PrescriptionStatus, { label: string; icon: typeof ClockIcon; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  uploaded: { label: "Uploaded", icon: FileImageIcon, variant: "secondary" },
  under_review: { label: "Under review", icon: ClockIcon, variant: "secondary" },
  verified: { label: "Verified", icon: CheckCircle2Icon, variant: "default" },
  rejected: { label: "Rejected", icon: XCircleIcon, variant: "destructive" },
}

const requestStatusConfig = {
  submitted: { label: "Pending", icon: ClockIcon, variant: "secondary" },
  pending: { label: "Pending", icon: ClockIcon, variant: "secondary" },
  under_review: { label: "Under review", icon: ClockIcon, variant: "secondary" },
  approved: { label: "Available", icon: CheckCircle2Icon, variant: "default" },
  rejected: { label: "Not available", icon: XCircleIcon, variant: "destructive" },
  draft: { label: "Draft", icon: ClockIcon, variant: "outline" },
  completed: { label: "Completed", icon: CheckCircle2Icon, variant: "default" },
} satisfies Record<PatientAvailabilityRequest["status"], { label: string; icon: typeof ClockIcon; variant: "default" | "secondary" | "outline" | "destructive" }>

type PatientRequestItem =
  | ({ type: "prescription" } & Prescription)
  | ({ type: "availability" } & PatientAvailabilityRequest)

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [availabilityRequests, setAvailabilityRequests] = useState<PatientAvailabilityRequest[]>([])
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
  const selectedFilePreview = useMemo(() => selectedFile ? URL.createObjectURL(selectedFile) : "", [selectedFile])
  const deliveryUnavailable = selectedPharmacy ? !selectedPharmacy.supportsDelivery : false
  const requestHistory = useMemo<PatientRequestItem[]>(() => {
    return [
      ...prescriptions.map((item) => ({ ...item, type: "prescription" as const })),
      ...availabilityRequests.map((item) => ({ ...item, type: "availability" as const })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [availabilityRequests, prescriptions])

  async function loadPageData() {
    setLoading(true)
    setError("")

    try {
      const [prescriptionsData, pharmaciesData, availabilityData] = await Promise.all([
        listPrescriptions(),
        listPrescriptionPharmacies(),
        listPatientAvailabilityRequests(),
      ])
      setPrescriptions(prescriptionsData.prescriptions)
      setAvailabilityRequests(availabilityData.requests)
      setPharmacies(pharmaciesData.pharmacies)
      setPharmacyId((current) => current || pharmaciesData.pharmacies[0]?.id || "")
    } catch {
      setError("Unable to load request history right now.")
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

  useEffect(() => {
    return () => {
      if (selectedFilePreview) URL.revokeObjectURL(selectedFilePreview)
    }
  }, [selectedFilePreview])

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
      toast.success("Prescription submitted", "The pharmacy will review it and send an update.")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to submit prescription."
      setError(message)
      toast.error("Prescription not submitted", message)
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
          <h2 className="font-[var(--font-display)] text-xl font-semibold">Request history</h2>
          <Badge variant="secondary">{requestHistory.length} total</Badge>
        </div>

        {error && !showUpload ? <p className="text-sm text-destructive">{error}</p> : null}

        {loading ? (
          <Card>
            <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading requests
            </CardContent>
          </Card>
        ) : null}

        {!loading && requestHistory.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No prescription or availability requests submitted yet.
            </CardContent>
          </Card>
        ) : null}

        {requestHistory.map((item) => {
          const config = (item.type === "prescription" ? statusConfig[item.status] : requestStatusConfig[item.status]) ?? {
            label: "Pending",
            icon: ClockIcon,
            variant: "secondary" as const,
          }
          const StatusIcon = config.icon

          return (
            <Card key={`${item.type}-${item.id}`} className="overflow-hidden border border-muted bg-card shadow-sm transition-all duration-200 hover:border-primary/45 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <CardContent className="grid gap-4 p-4 md:grid-cols-[9rem_1fr] md:items-start">
                <div className="md:self-start">
                  {item.type === "prescription" && item.imageUrl ? (
                    <PrescriptionImage
                      alt="Prescription preview"
                      src={getApiUrl(item.imageUrl)}
                      className="aspect-[4/3] min-h-0 rounded-lg border border-muted/80 shadow-sm"
                      imageClassName="max-h-24"
                      label="Prescription"
                      showOverlay={false}
                    />
                  ) : item.type === "prescription" ? (
                    <div className="flex aspect-[4/3] items-center justify-center rounded-lg border bg-muted/20 text-muted-foreground">
                      <FileImageIcon className="size-8 text-muted-foreground/75" />
                    </div>
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center rounded-lg border bg-muted/20 text-muted-foreground">
                      <PackageSearchIcon className="size-8 text-muted-foreground/75" />
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-2.5 flex flex-wrap gap-1.5">
                        <Badge variant={config.variant} className="px-2 py-0.5 text-[10px] font-semibold tracking-wide">
                          <StatusIcon className="mr-1 size-3" />
                          {config.label}
                        </Badge>
                        <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-medium border-muted-foreground/20 text-muted-foreground">
                          {item.type === "prescription" ? "Prescription" : "AvailabilitySearch"}
                        </Badge>
                        {item.type === "prescription" ? (
                          <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-medium border-primary/20 text-primary bg-primary/5">
                            {item.neighborhood}
                          </Badge>
                        ) : null}
                      </div>
                      <CardTitle className="text-base font-semibold leading-snug tracking-tight text-foreground">
                        {item.type === "prescription" ? `Prescription #${item.id.slice(0, 8).toUpperCase()}` : item.medicineName}
                      </CardTitle>
                      <CardDescription className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <span>{item.pharmacy}</span>
                        <span>·</span>
                        <span>{formatDate(item.createdAt)}</span>
                      </CardDescription>
                    </div>
                  </div>

                  <div className="rounded-lg border border-muted bg-muted/25 px-3 py-2.5 text-xs text-muted-foreground/90 leading-relaxed font-medium">
                    {item.notes || (item.type === "prescription" ? "Submitted for pharmacy review. The selected pharmacy will respond with approval, rejection, or next steps." : "Waiting for a pharmacy response. You can send another search request if the medicine is urgent.")}
                  </div>
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
                  <Select
                    value={pharmacyId}
                    onValueChange={(value) => {
                      if (!value) return
                      const nextPharmacy = pharmacies.find((pharmacy) => pharmacy.id === value)
                      setPharmacyId(value)
                      if (nextPharmacy && !nextPharmacy.supportsDelivery) {
                        setIsDelivery(false)
                        setDeliveryAddress("")
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose pharmacy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {pharmacies.map((pharmacy) => (
                          <SelectItem key={pharmacy.id} value={pharmacy.id}>
                            {pharmacy.name} - {pharmacy.neighborhood}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </label>

                {/* File input */}
                <div className="relative">
                  {selectedFilePreview ? (
                    <div className="flex flex-col gap-3 w-full rounded-lg border border-muted bg-card p-3 shadow-sm">
                      <div className="relative w-full overflow-hidden rounded-md border aspect-[4/3] bg-muted/20">
                        <PrescriptionImage alt="Selected prescription preview" src={selectedFilePreview} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex items-center justify-between gap-2 px-1">
                        <span className="text-xs font-semibold text-foreground truncate max-w-[170px]">{selectedFile?.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2"
                          onClick={() => {
                            setSelectedFile(null);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/35 bg-muted/10 p-6 text-center transition-all duration-200 hover:bg-muted/25 hover:border-primary/50">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-200">
                        <UploadIcon className="size-5" />
                      </div>
                      <span className="text-sm font-medium text-foreground">Select a prescription image</span>
                      <span className="mt-1 text-[11px] text-muted-foreground">Click to browse files</span>
                      <span className="mt-3 text-[10px] text-muted-foreground/70 border-t border-muted/80 w-full pt-2">
                        Supports JPEG, PNG up to 5 MB
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                    </label>
                  )}
                </div>

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
                  {uploading ? "Submitting..." : "Submit prescription"}
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
