"use client"

import { CheckCircle2Icon, ClockIcon, FileImageIcon, Loader2Icon, PackageIcon, UploadIcon, UserRoundIcon, XCircleIcon } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type PrescriptionStatus = "uploaded" | "under_review" | "verified" | "rejected"

type Prescription = {
  id: string
  status: PrescriptionStatus
  pharmacy: string
  note: string
  date: string
  isDelivery: boolean
  proxyName?: string
}

// TODO: replace with API data when prescription service is wired
const mockPrescriptions: Prescription[] = [
  { id: "#MAP-7822-AD", status: "under_review", pharmacy: "Lion Pharmacy", note: "2 medications identified", date: "May 9, 2026", isDelivery: false },
  { id: "#MAP-7794-BA", status: "verified", pharmacy: "Wudassie Pharmacy", note: "Ready for pickup", date: "May 8, 2026", isDelivery: false },
  { id: "#MAP-7731-KZ", status: "verified", pharmacy: "HealthPlus", note: "Delivered yesterday", date: "May 7, 2026", isDelivery: true },
]

const statusConfig: Record<PrescriptionStatus, { label: string; icon: typeof ClockIcon; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  uploaded: { label: "Uploaded", icon: FileImageIcon, variant: "secondary" },
  under_review: { label: "Under review", icon: ClockIcon, variant: "secondary" },
  verified: { label: "Verified", icon: CheckCircle2Icon, variant: "default" },
  rejected: { label: "Rejected", icon: XCircleIcon, variant: "destructive" },
}

export default function PrescriptionsPage() {
  const [showUpload, setShowUpload] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [notes, setNotes] = useState("")
  const [isDelivery, setIsDelivery] = useState(false)
  const [proxyName, setProxyName] = useState("")
  const [proxyPhone, setProxyPhone] = useState("")
  const [uploading, setUploading] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setSelectedFile(file)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile) return

    setUploading(true)
    // TODO: wire to POST /api/prescriptions when service is built
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setUploading(false)
    setShowUpload(false)
    setSelectedFile(null)
    setNotes("")
    setIsDelivery(false)
    setProxyName("")
    setProxyPhone("")
  }

  return (
    <main className="grid gap-6 p-4 md:grid-cols-[1fr_22rem] md:p-6">
      {/* Prescriptions list */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-[var(--font-display)] text-xl font-semibold">Your prescriptions</h2>
          <Badge variant="secondary">{mockPrescriptions.length} total</Badge>
        </div>

        {mockPrescriptions.map((rx) => {
          const config = statusConfig[rx.status]
          const StatusIcon = config.icon

          return (
            <Card key={rx.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{rx.id}</CardTitle>
                  <CardDescription className="mt-1 flex items-center gap-2">
                    {rx.pharmacy}
                    <span className="text-muted-foreground">·</span>
                    {rx.date}
                  </CardDescription>
                </div>
                <Badge variant={config.variant}>
                  <StatusIcon className="mr-1 size-3.5" />
                  {config.label}
                </Badge>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{rx.note}</p>
                <div className="flex gap-1">
                  {rx.isDelivery ? (
                    <Badge variant="outline">
                      <PackageIcon className="mr-1 size-3" />
                      Delivery
                    </Badge>
                  ) : null}
                  {rx.proxyName ? (
                    <Badge variant="outline">
                      <UserRoundIcon className="mr-1 size-3" />
                      Proxy
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
                      onChange={() => { setIsDelivery(false); setProxyName(""); setProxyPhone("") }}
                    />
                    Self pickup
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="collection"
                      checked={isDelivery}
                      onChange={() => { setIsDelivery(true); setProxyName(""); setProxyPhone("") }}
                    />
                    Delivery
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="collection"
                      checked={!isDelivery && !!proxyName}
                      onChange={() => { setIsDelivery(false); setProxyName(" ") }}
                    />
                    Proxy pickup
                  </label>
                </fieldset>

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

                <Button type="submit" disabled={!selectedFile || uploading}>
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
