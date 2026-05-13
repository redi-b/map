"use client"

import { CheckIcon, FileImageIcon, Loader2Icon, MessageSquareTextIcon, PackageCheckIcon, XIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PrescriptionImage } from "@/components/map/prescription-image"
import {
  getApiUrl,
  listPharmacyAvailabilityRequests,
  listPharmacyPrescriptions,
  respondToAvailabilityRequest,
  reviewPrescription,
  type AvailabilityRequest,
  type PharmacyPrescription,
} from "@/lib/api"
import { toast } from "@/lib/toast"

type InboxItem =
  | ({ type: "prescription" } & PharmacyPrescription)
  | ({ type: "availability" } & AvailabilityRequest)

const statusLabels: Record<string, string> = {
  uploaded: "Uploaded",
  pending: "Pending",
  under_review: "Under review",
  verified: "Approved",
  approved: "Approved",
  rejected: "Rejected",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function getStatusVariant(status: string) {
  if (status === "verified" || status === "approved") return "default"
  if (status === "rejected") return "destructive"
  return "secondary"
}

function getItemTitle(item: InboxItem) {
  return item.type === "prescription" ? "Prescription review" : item.medicineName
}

function getItemSubtitle(item: InboxItem) {
  return item.type === "prescription" ? item.notes || "Uploaded prescription image" : item.notes || "Availability request"
}

export default function PharmacyRequestsPage() {
  const [prescriptions, setPrescriptions] = useState<PharmacyPrescription[]>([])
  const [availabilityRequests, setAvailabilityRequests] = useState<AvailabilityRequest[]>([])
  const [selectedKey, setSelectedKey] = useState("")
  const [instructions, setInstructions] = useState("")
  const [estimatedCost, setEstimatedCost] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const inbox = useMemo<InboxItem[]>(() => {
    return [
      ...prescriptions.map((item) => ({ ...item, type: "prescription" as const })),
      ...availabilityRequests.map((item) => ({ ...item, type: "availability" as const })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [availabilityRequests, prescriptions])

  const selected = inbox.find((item) => `${item.type}:${item.id}` === selectedKey) ?? inbox[0]

  async function loadRequests() {
    setLoading(true)
    setError("")

    try {
      const [prescriptionData, availabilityData] = await Promise.all([
        listPharmacyPrescriptions(),
        listPharmacyAvailabilityRequests(),
      ])
      setPrescriptions(prescriptionData.prescriptions)
      setAvailabilityRequests(availabilityData.requests)
      setSelectedKey((current) => current || (prescriptionData.prescriptions[0] ? `prescription:${prescriptionData.prescriptions[0].id}` : availabilityData.requests[0] ? `availability:${availabilityData.requests[0].id}` : ""))
    } catch {
      setError("Unable to load pharmacy requests.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadRequests()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [])

  async function handlePrescriptionReview(action: "approve" | "reject") {
    if (!selected || selected.type !== "prescription") return

    setSaving(true)
    setError("")

    try {
      await reviewPrescription({
        prescriptionId: selected.id,
        action,
        instructions: instructions.trim() || undefined,
        estimatedCostEtb: estimatedCost ? Number(estimatedCost) : undefined,
      })
      setInstructions("")
      setEstimatedCost("")
      await loadRequests()
      toast.success(action === "approve" ? "Prescription approved" : "Prescription rejected")
    } catch {
      setError("Unable to update this prescription request.")
      toast.error("Prescription not updated", "Try again in a moment.")
    } finally {
      setSaving(false)
    }
  }

  async function handleAvailabilityResponse(response: "available" | "not_available") {
    if (!selected || selected.type !== "availability") return

    setSaving(true)
    setError("")

    try {
      await respondToAvailabilityRequest({
        requestId: selected.id,
        response,
        notes: instructions.trim() || undefined,
        estimatedPriceEtb: estimatedCost ? Number(estimatedCost) : undefined,
      })
      setInstructions("")
      setEstimatedCost("")
      await loadRequests()
      toast.success(response === "available" ? "Availability confirmed" : "Availability declined")
    } catch {
      setError("Unable to update this availability request.")
      toast.error("Request not updated", "Try again in a moment.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="grid gap-6 p-4 lg:grid-cols-[0.34fr_0.66fr] md:p-6">
      <aside className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-[var(--font-display)] text-xl font-semibold">Request queue</h2>
          <Badge variant="secondary">{inbox.length} open</Badge>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading requests
            </CardContent>
          </Card>
        ) : null}

        {!loading && inbox.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">No pharmacy requests are waiting right now.</CardContent>
          </Card>
        ) : null}

        {inbox.map((item) => {
          const key = `${item.type}:${item.id}`
          const active = selected ? key === `${selected.type}:${selected.id}` : false

          return (
            <button key={key} className="cursor-pointer text-left" onClick={() => setSelectedKey(key)}>
              <Card className={active ? "bg-primary/5 ring-2 ring-primary/70" : "transition hover:bg-muted/30"}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{item.patientName}</h3>
                      <p className="text-sm text-muted-foreground">{getItemTitle(item)}</p>
                      <Badge className="mt-2" variant={getStatusVariant(item.status)}>
                        {item.type === "prescription" ? <FileImageIcon className="mr-1 size-3" /> : <PackageCheckIcon className="mr-1 size-3" />}
                        {statusLabels[item.status] ?? item.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            </button>
          )
        })}
      </aside>

      <section className="grid gap-4 xl:grid-cols-[0.55fr_0.45fr]">
        <Card>
          <CardHeader>
            <CardTitle>{selected?.type === "prescription" ? "Prescription image" : "Availability details"}</CardTitle>
            <CardDescription>{selected ? getItemSubtitle(selected) : "Select a request to review."}</CardDescription>
          </CardHeader>
          <CardContent>
            {selected?.type === "prescription" && selected.imageUrl ? (
              <PrescriptionImage alt="Uploaded prescription" src={getApiUrl(selected.imageUrl)} />
            ) : (
              <div className="flex aspect-[4/5] flex-col items-center justify-center gap-3 rounded-lg border bg-muted p-6 text-center text-muted-foreground">
                {selected?.type === "availability" ? <PackageCheckIcon className="size-8" /> : <FileImageIcon className="size-8" />}
                <p className="text-sm">
                  {selected?.type === "availability"
                    ? `${selected.medicineName}${selected.isDelivery ? " requested for delivery" : ""}`
                    : "No prescription image is attached."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{selected?.patientName ?? "Patient request"}</CardTitle>
              <CardDescription>
                {selected ? `${selected.type === "prescription" ? "Prescription" : "Availability"} request received ${formatDate(selected.createdAt)}` : "No request selected"}
              </CardDescription>
            </CardHeader>
            {selected ? (
              <CardContent className="flex flex-wrap gap-2">
                {selected.type === "availability" && selected.isDelivery ? <Badge variant="outline">Delivery requested</Badge> : null}
                {selected.type === "availability" && selected.proxyName ? <Badge variant="outline">Proxy pickup</Badge> : null}
                <Badge variant={getStatusVariant(selected.status)}>{statusLabels[selected.status] ?? selected.status}</Badge>
              </CardContent>
            ) : null}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareTextIcon className="size-5" />
                Response
              </CardTitle>
              <CardDescription>Send a clear status update to the patient.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm font-medium">
                Notes
                <Input value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Ready for pickup, stock unavailable, or next steps" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Estimated price ETB
                <Input type="number" min="0" step="0.01" value={estimatedCost} onChange={(event) => setEstimatedCost(event.target.value)} placeholder="Optional" />
              </label>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="flex flex-wrap gap-2">
                {selected?.type === "prescription" ? (
                  <>
                    <Button variant="outline" disabled={!selected || saving} onClick={() => void handlePrescriptionReview("reject")}>
                      {saving ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <XIcon data-icon="inline-start" />}
                      Reject
                    </Button>
                    <Button disabled={!selected || saving} onClick={() => void handlePrescriptionReview("approve")}>
                      {saving ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <CheckIcon data-icon="inline-start" />}
                      Approve
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" disabled={!selected || saving} onClick={() => void handleAvailabilityResponse("not_available")}>
                      {saving ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <XIcon data-icon="inline-start" />}
                      Not available
                    </Button>
                    <Button disabled={!selected || saving} onClick={() => void handleAvailabilityResponse("available")}>
                      {saving ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <CheckIcon data-icon="inline-start" />}
                      Available
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
