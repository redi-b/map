"use client"

import { Building2Icon, CheckCircle2Icon, PlusIcon, ShieldCheckIcon, XCircleIcon } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type PharmacyEntry = {
  id: string
  name: string
  branchName: string
  neighborhood: string
  licenseNumber: string
  phone: string
  isVerified: boolean
}

// TODO: wire to admin API when admin routes are built
const initialPharmacies: PharmacyEntry[] = [
  { id: "1", name: "Lion Pharmacy", branchName: "Bole Medhanialem", neighborhood: "Bole", licenseNumber: "AA-PH-1001", phone: "+251911000101", isVerified: true },
  { id: "2", name: "Wudassie Pharmacy", branchName: "Kazanchis", neighborhood: "Kazanchis", licenseNumber: "AA-PH-1002", phone: "+251911000202", isVerified: true },
  { id: "3", name: "HealthPlus Pharmacy", branchName: "Piazza", neighborhood: "Piazza", licenseNumber: "AA-PH-1003", phone: "+251911000303", isVerified: true },
  { id: "4", name: "Red Cross Pharmacy", branchName: "Megenagna", neighborhood: "Megenagna", licenseNumber: "AA-PH-1004", phone: "+251911000404", isVerified: true },
  { id: "5", name: "Unity Pharma", branchName: "Sarbet", neighborhood: "Sarbet", licenseNumber: "AA-PH-1005", phone: "+251911000505", isVerified: false },
  { id: "6", name: "Arada Med", branchName: "Arada", neighborhood: "Arada", licenseNumber: "AA-PH-1006", phone: "+251911000606", isVerified: false },
]

export default function PharmacyVerificationPage() {
  const [pharmacies, setPharmacies] = useState(initialPharmacies)
  const [filter, setFilter] = useState<"all" | "verified" | "pending">("all")
  const [showRegister, setShowRegister] = useState(false)

  // Register form state
  const [regName, setRegName] = useState("")
  const [regBranch, setRegBranch] = useState("")
  const [regNeighborhood, setRegNeighborhood] = useState("")
  const [regLicense, setRegLicense] = useState("")
  const [regPhone, setRegPhone] = useState("")

  const filtered = pharmacies.filter((p) => {
    if (filter === "verified") return p.isVerified
    if (filter === "pending") return !p.isVerified
    return true
  })

  const verifiedCount = pharmacies.filter((p) => p.isVerified).length
  const pendingCount = pharmacies.filter((p) => !p.isVerified).length

  function toggleVerify(id: string) {
    setPharmacies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isVerified: !p.isVerified } : p))
    )
  }

  function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    const newPharmacy: PharmacyEntry = {
      id: String(Date.now()),
      name: regName,
      branchName: regBranch,
      neighborhood: regNeighborhood,
      licenseNumber: regLicense,
      phone: regPhone,
      isVerified: false,
    }
    setPharmacies((prev) => [...prev, newPharmacy])
    setShowRegister(false)
    setRegName("")
    setRegBranch("")
    setRegNeighborhood("")
    setRegLicense("")
    setRegPhone("")
  }

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      {/* Summary */}
      <section className="grid gap-4 md:grid-cols-3">
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
      </section>

      {/* Pharmacy list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Pharmacy registry</CardTitle>
            <CardDescription>Manage pharmacy onboarding and verified participation.</CardDescription>
          </div>
          <Button onClick={() => setShowRegister((v) => !v)}>
            <PlusIcon data-icon="inline-start" />
            Register pharmacy
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Filter */}
          <div className="flex gap-2">
            {(["all", "verified", "pending"] as const).map((f) => (
              <Button key={f} variant={filter === f ? "secondary" : "outline"} size="sm" onClick={() => setFilter(f)}>
                {f === "all" ? "All" : f === "verified" ? "Verified" : "Pending"}
              </Button>
            ))}
          </div>

          {/* Registration form */}
          {showRegister ? (
            <form onSubmit={handleRegister} className="flex flex-col gap-3 rounded-lg border bg-secondary/50 p-4">
              <p className="font-medium">Register a new pharmacy</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="Pharmacy name" value={regName} onChange={(e) => setRegName(e.target.value)} required />
                <Input placeholder="Branch name" value={regBranch} onChange={(e) => setRegBranch(e.target.value)} required />
                <Input placeholder="Neighborhood" value={regNeighborhood} onChange={(e) => setRegNeighborhood(e.target.value)} required />
                <Input placeholder="License number" value={regLicense} onChange={(e) => setRegLicense(e.target.value)} required />
                <Input placeholder="Phone (+251...)" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} required />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Register</Button>
                <Button type="button" variant="ghost" onClick={() => setShowRegister(false)}>Cancel</Button>
              </div>
            </form>
          ) : null}

          {/* List */}
          {filtered.map((pharmacy) => (
            <div key={pharmacy.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-secondary">
                  <Building2Icon className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">{pharmacy.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {pharmacy.branchName}, {pharmacy.neighborhood} · {pharmacy.licenseNumber}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={pharmacy.isVerified ? "default" : "secondary"}>
                  {pharmacy.isVerified ? "Verified" : "Pending"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleVerify(pharmacy.id)}
                >
                  {pharmacy.isVerified ? (
                    <>
                      <XCircleIcon data-icon="inline-start" />
                      Revoke
                    </>
                  ) : (
                    <>
                      <CheckCircle2Icon data-icon="inline-start" />
                      Verify
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  )
}
