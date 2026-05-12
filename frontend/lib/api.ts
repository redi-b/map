const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export function getApiUrl(path: string) {
  return `${apiBaseUrl}${path}`
}

export type UserRole = "patient" | "pharmacist" | "admin"

export type CurrentUser = {
  session: {
    user: {
      id: string
      name?: string | null
      email: string
    }
  }
  profile: {
    id: string
    authUserId: string
    fullName: string
    phone: string | null
    role: UserRole
    isActive: boolean
  } | null
}

export type MedicineSearchResult = {
  id: string
  medicine: string
  category: string
  pharmacy: string
  neighborhood: string
  distanceMeters: number
  priceEtb: number
  stockStatus: "in_stock" | "low_stock" | "out_of_stock"
  deliveryAvailable: boolean
  updatedAt: string
}

export type CurrentAccess = {
  role: UserRole
  areas: string[]
  dashboardPaths: string[]
  homePath: string
}

export type DoseStatus = "taken" | "skipped" | "upcoming"

export type AdherenceDose = {
  id: string
  reminderId: string
  medicine: string
  dosage: string
  frequency: string
  time: string
  scheduledAt: string
  status: DoseStatus
}

export type TodayAdherence = {
  doses: AdherenceDose[]
  summary: {
    total: number
    taken: number
    skipped: number
    upcoming: number
    progress: number
    refillAlerts: number
  }
}

export type AssistantMessage = {
  id: string
  sender: "user" | "assistant"
  content: string
  hasDisclaimer: boolean
  timestamp: string
}

export type AssistantSession = {
  id: string
  title: string
  createdAt: string
  messages: AssistantMessage[]
}

export type PrescriptionStatus = "uploaded" | "under_review" | "verified" | "rejected"

export type PrescriptionPharmacy = {
  id: string
  name: string
  neighborhood: string
  supportsDelivery: boolean
}

export type Prescription = {
  id: string
  status: PrescriptionStatus
  imageUrl: string | null
  imageMimeType: string | null
  notes: string | null
  pharmacy: string
  neighborhood: string
  createdAt: string
  updatedAt: string
}

export type PharmacyPrescription = {
  id: string
  status: PrescriptionStatus
  imageUrl: string | null
  imageMimeType: string | null
  notes: string | null
  patientName: string
  createdAt: string
}

export type AvailabilityRequest = {
  id: string
  medicineName: string
  status: "pending" | "under_review" | "approved" | "rejected"
  notes: string | null
  isDelivery: boolean
  proxyName: string | null
  patientName: string
  createdAt: string
}

export type SearchFilters = {
  q: string
  neighborhood?: string
  inStock?: boolean
  delivery?: boolean
  maxPrice?: number
}

export async function searchMedicines(filters: SearchFilters | string) {
  const params = new URLSearchParams()

  if (typeof filters === "string") {
    params.set("q", filters)
  } else {
    params.set("q", filters.q)
    if (filters.neighborhood) params.set("neighborhood", filters.neighborhood)
    if (filters.inStock) params.set("inStock", "true")
    if (filters.delivery) params.set("delivery", "true")
    if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice))
  }

  const response = await fetch(`${apiBaseUrl}/api/medicines/search?${params}`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Unable to search medicines")
  }

  return response.json() as Promise<{
    query: { q: string; neighborhood?: string; inStock?: boolean }
    results: MedicineSearchResult[]
  }>
}

export async function getNeighborhoods() {
  const response = await fetch(`${apiBaseUrl}/api/medicines/neighborhoods`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Unable to load neighborhoods")
  }

  return response.json() as Promise<{ neighborhoods: string[] }>
}

export async function getCurrentAccess() {
  const response = await fetch(`${apiBaseUrl}/api/access`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Unable to load access rules")
  }

  return response.json() as Promise<CurrentAccess>
}

export async function getTodayAdherence() {
  const response = await fetch(`${apiBaseUrl}/api/adherence/today`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Unable to load adherence schedule")
  }

  return response.json() as Promise<TodayAdherence>
}

export async function createReminder(input: {
  medicineName: string
  dosage: string
  frequency: string
  nextDoseAt: string
  durationDays?: number
  supplyRemainingDays?: number
}) {
  const response = await fetch(`${apiBaseUrl}/api/reminders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error("Unable to create reminder")
  }

  return response.json()
}

export async function updateDoseEventStatus(id: string, status: DoseStatus) {
  const response = await fetch(`${apiBaseUrl}/api/dose-events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status }),
  })

  if (!response.ok) {
    throw new Error("Unable to update dose")
  }

  return response.json()
}

export async function resetTodayAdherence() {
  const response = await fetch(`${apiBaseUrl}/api/adherence/today/reset`, {
    method: "POST",
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Unable to reset doses")
  }

  return response.json() as Promise<{ resetCount: number }>
}

export async function listAssistantSessions() {
  const response = await fetch(`${apiBaseUrl}/api/assistant/sessions`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Unable to load conversations")
  }

  return response.json() as Promise<{ sessions: AssistantSession[] }>
}

export async function createAssistantSession() {
  const response = await fetch(`${apiBaseUrl}/api/assistant/sessions`, {
    method: "POST",
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Unable to create conversation")
  }

  return response.json() as Promise<AssistantSession>
}

export async function sendAssistantMessage(sessionId: string, content: string) {
  const response = await fetch(`${apiBaseUrl}/api/assistant/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ content }),
  })

  if (!response.ok) {
    throw new Error("Unable to send message")
  }

  return response.json() as Promise<AssistantSession>
}

export async function deleteAssistantSession(sessionId: string) {
  const response = await fetch(`${apiBaseUrl}/api/assistant/sessions/${sessionId}`, {
    method: "DELETE",
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Unable to delete conversation")
  }

  return response.json() as Promise<{ success: true }>
}

export async function listPrescriptionPharmacies() {
  const response = await fetch(`${apiBaseUrl}/api/prescriptions/pharmacies`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Unable to load pharmacies")
  }

  return response.json() as Promise<{ pharmacies: PrescriptionPharmacy[] }>
}

export async function listPrescriptions() {
  const response = await fetch(`${apiBaseUrl}/api/prescriptions`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Unable to load prescriptions")
  }

  return response.json() as Promise<{ prescriptions: Prescription[] }>
}

export async function createPrescription(input: {
  pharmacyId: string
  image: File
  notes?: string
  isDelivery: boolean
  deliveryAddress?: string
  proxyName?: string
  proxyPhone?: string
}) {
  const formData = new FormData()
  formData.set("pharmacyId", input.pharmacyId)
  formData.set("image", input.image)
  formData.set("isDelivery", String(input.isDelivery))
  if (input.notes) formData.set("notes", input.notes)
  if (input.deliveryAddress) formData.set("deliveryAddress", input.deliveryAddress)
  if (input.proxyName) formData.set("proxyName", input.proxyName)
  if (input.proxyPhone) formData.set("proxyPhone", input.proxyPhone)

  const response = await fetch(`${apiBaseUrl}/api/prescriptions`, {
    method: "POST",
    credentials: "include",
    body: formData,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? "Unable to submit prescription")
  }

  return response.json()
}

export async function listPharmacyPrescriptions() {
  const response = await fetch(`${apiBaseUrl}/api/prescriptions/pharmacy`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Unable to load prescription requests")
  }

  return response.json() as Promise<{ prescriptions: PharmacyPrescription[] }>
}

export async function reviewPrescription(input: {
  prescriptionId: string
  action: "approve" | "reject" | "request_resubmit" | "suggest_alternate"
  instructions?: string
  estimatedCostEtb?: number
}) {
  const response = await fetch(`${apiBaseUrl}/api/prescriptions/${input.prescriptionId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      action: input.action,
      instructions: input.instructions,
      estimatedCostEtb: input.estimatedCostEtb,
    }),
  })

  if (!response.ok) {
    throw new Error("Unable to update prescription request")
  }

  return response.json()
}

export async function listPharmacyAvailabilityRequests() {
  const response = await fetch(`${apiBaseUrl}/api/availability-requests/pharmacy`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Unable to load availability requests")
  }

  return response.json() as Promise<{ requests: AvailabilityRequest[] }>
}

export async function respondToAvailabilityRequest(input: {
  requestId: string
  response: "available" | "not_available" | "alternate"
  notes?: string
  alternativeMedicineName?: string
  estimatedPriceEtb?: number
}) {
  const response = await fetch(`${apiBaseUrl}/api/availability-requests/${input.requestId}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      response: input.response,
      notes: input.notes,
      alternativeMedicineName: input.alternativeMedicineName,
      estimatedPriceEtb: input.estimatedPriceEtb,
    }),
  })

  if (!response.ok) {
    throw new Error("Unable to update availability request")
  }

  return response.json()
}

export async function getCurrentUser() {
  const response = await fetch(`${apiBaseUrl}/api/me`, {
    credentials: "include",
  })

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new Error("Unable to load current user")
  }

  return response.json() as Promise<CurrentUser>
}

export async function saveProfile(input: {
  fullName: string
  phone?: string
  role: UserRole
}) {
  const response = await fetch(`${apiBaseUrl}/api/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)

    if (body?.details) {
      const err = new Error(JSON.stringify(body))
      err.message = JSON.stringify(body)
      throw err
    }

    throw new Error("Unable to save profile")
  }

  return response.json()
}
