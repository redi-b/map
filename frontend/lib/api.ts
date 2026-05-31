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
    mustChangePassword: boolean
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
  quantity: number
  deliveryAvailable: boolean
  expiresAt: string | null
  updatedAt: string
}

export type MedicineSuggestion = {
  medicine: string
  category: string
  query: string
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
  isDelivery: boolean
  deliveryAddress: string | null
  proxyName: string | null
  proxyPhone: string | null
  notes: string | null
  pharmacy: string
  neighborhood: string
  latestReview: {
    action: string
    instructions: string | null
    estimatedCostEtb: number | null
    alternativeMedicineName: string | null
    createdAt: string
  } | null
  createdAt: string
  updatedAt: string
}

export type PharmacyPrescription = {
  id: string
  status: PrescriptionStatus
  imageUrl: string | null
  imageMimeType: string | null
  isDelivery: boolean
  deliveryAddress: string | null
  proxyName: string | null
  proxyPhone: string | null
  notes: string | null
  patientName: string
  createdAt: string
}

export type AvailabilityRequest = {
  id: string
  medicineName: string
  status: "pending" | "under_review" | "approved" | "rejected" | "submitted" | "draft" | "completed"
  notes: string | null
  isDelivery: boolean
  deliveryAddress: string | null
  proxyName: string | null
  proxyPhone: string | null
  patientName: string
  createdAt: string
}

export type PatientAvailabilityRequest = {
  id: string
  medicineName: string
  status: "pending" | "under_review" | "approved" | "rejected" | "submitted" | "draft" | "completed"
  notes: string | null
  isDelivery: boolean
  deliveryAddress: string | null
  proxyName: string | null
  proxyPhone: string | null
  pharmacy: string
  latestResponse: {
    response: string
    pharmacy: string
    alternativeMedicineName: string | null
    estimatedPriceEtb: number | null
    notes: string | null
    createdAt: string
  } | null
  createdAt: string
}

export type DashboardIconName = "activity" | "bell" | "clipboard" | "package" | "shield" | "trend" | "users"

export type DashboardSummary = {
  role: UserRole
  hero: {
    badge: string
    title: string
    description: string
    primaryHref: string
    primaryLabel: string
    primaryIcon: DashboardIconName
    secondaryHref: string
    secondaryLabel: string
    secondaryIcon: DashboardIconName
  }
  kpis: Array<{
    label: string
    value: string
    detail: string
    icon: DashboardIconName
  }>
  chart: {
    title: string
    description: string
    kind: "area" | "bar"
    firstKey: string
    secondKey: string
    firstLabel: string
    secondLabel: string
    firstColor: string
    secondColor: string
    data: Array<Record<string, string | number>>
  }
  ring: {
    title: string
    description: string
    data: Array<{
      label: string
      value: number
      maxValue: number
      color: string
    }>
  }
  lists: Array<{
    title: string
    description: string
    rows: Array<{ label: string; detail: string; badge: string }>
    empty: string
  }>
}

export type AdminPharmacy = {
  id: string
  name: string
  branchName: string | null
  licenseNumber: string
  address: string
  neighborhood: string
  phone: string
  email: string | null
  latitude: number | null
  longitude: number | null
  supportsDelivery: boolean
  operatingHours: string | null
  isVerified: boolean
  createdAt: string
}

export type AdminUser = {
  id: string
  authUserId: string
  fullName: string
  phone: string | null
  role: UserRole
  isActive: boolean
  mustChangePassword: boolean
  createdAt: string
  email: string
  accountName: string
  isCurrentUser: boolean
  pharmacyId: string | null
  pharmacyName: string | null
  pharmacyBranchName: string | null
}

export type AuditLog = {
  id: string
  actorProfileId: string | null
  actorName: string | null
  action: string
  entityType: string
  entityId: string | null
  details: Record<string, unknown> | null
  createdAt: string
}

export type PharmacySetupPharmacy = {
  id: string
  name: string
  branchName: string | null
  licenseNumber: string
  address: string
  neighborhood: string
  phone: string
  email: string | null
  latitude: number | null
  longitude: number | null
  supportsDelivery: boolean
  operatingHours: string | null
  isVerified: boolean
}

export type PharmacySetupState = {
  assignedPharmacy: PharmacySetupPharmacy | null
}

export type SearchFilters = {
  q: string
  neighborhood?: string
  inStock?: boolean
  delivery?: boolean
  maxPrice?: number
  latitude?: number
  longitude?: number
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
    if (filters.latitude !== undefined) params.set("latitude", String(filters.latitude))
    if (filters.longitude !== undefined) params.set("longitude", String(filters.longitude))
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

export async function getMedicineSuggestions(q: string) {
  const params = new URLSearchParams({ q })
  const response = await fetch(`${apiBaseUrl}/api/medicines/suggestions?${params}`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Unable to load suggestions")
  }

  return response.json() as Promise<{ suggestions: MedicineSuggestion[] }>
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

export async function getDashboardSummary() {
  const response = await fetch(`${apiBaseUrl}/api/dashboard/summary`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Unable to load dashboard")
  }

  return response.json() as Promise<DashboardSummary>
}

export async function listAdminPharmacies() {
  const response = await fetch(`${apiBaseUrl}/api/admin/pharmacies`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Unable to load pharmacies")
  }

  return response.json() as Promise<{ pharmacies: AdminPharmacy[] }>
}

export async function createAdminPharmacy(input: {
  name: string
  branchName?: string
  licenseNumber: string
  address: string
  neighborhood: string
  phone: string
  email?: string
  latitude?: number
  longitude?: number
  supportsDelivery: boolean
  operatingHours?: string
  isVerified?: boolean
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone?: string
}) {
  const response = await fetch(`${apiBaseUrl}/api/admin/pharmacies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error("Unable to register pharmacy")
  }

  return response.json() as Promise<{
    pharmacy: AdminPharmacy
    primaryUser: {
      id: string
      fullName: string
      email: string
      initialPassword: string
    }
  }>
}

export async function verifyAdminPharmacy(id: string, isVerified: boolean) {
  const response = await fetch(`${apiBaseUrl}/api/admin/pharmacies/${id}/verify`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ isVerified }),
  })

  if (!response.ok) {
    throw new Error("Unable to update pharmacy")
  }

  return response.json() as Promise<AdminPharmacy>
}

export async function listAdminUsers() {
  const response = await fetch(`${apiBaseUrl}/api/admin/users`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Unable to load users")
  }

  return response.json() as Promise<{ users: AdminUser[] }>
}

export async function listAuditLogs() {
  const response = await fetch(`${apiBaseUrl}/api/admin/audit-logs`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Unable to load audit logs")
  }

  return response.json() as Promise<{ logs: AuditLog[] }>
}

export async function updateAdminUser(id: string, input: { role?: UserRole; isActive?: boolean; pharmacyId?: string | null }) {
  const response = await fetch(`${apiBaseUrl}/api/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error("Unable to update user")
  }

  return response.json() as Promise<AdminUser>
}

export async function createAdminUser(input: {
  fullName: string
  email: string
  phone?: string
  role: "pharmacist"
  pharmacyId: string
}) {
  const response = await fetch(`${apiBaseUrl}/api/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error("Unable to create user")
  }

  return response.json() as Promise<{ user: AdminUser; initialPassword: string }>
}

export async function getPharmacySetup() {
  const response = await fetch(`${apiBaseUrl}/api/pharmacy/setup`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Unable to load pharmacy setup")
  }

  return response.json() as Promise<PharmacySetupState>
}

export async function completePharmacyPasswordSetup(input: {
  currentPassword: string
  newPassword: string
}) {
  const response = await fetch(`${apiBaseUrl}/api/pharmacy/setup/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error("Unable to change password")
  }

  return response.json() as Promise<PharmacySetupState>
}

export async function updatePharmacySetupLocation(input: {
  latitude: number
  longitude: number
}) {
  const response = await fetch(`${apiBaseUrl}/api/pharmacy/setup/location`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error("Unable to update pharmacy location")
  }

  return response.json() as Promise<PharmacySetupState>
}

export async function changeAccountPassword(input: {
  currentPassword: string
  newPassword: string
}) {
  const response = await fetch(`${apiBaseUrl}/api/account/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error("Unable to change password")
  }

  return response.json()
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

export async function listPatientAvailabilityRequests() {
  const response = await fetch(`${apiBaseUrl}/api/availability-requests`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Unable to load availability requests")
  }

  return response.json() as Promise<{ requests: PatientAvailabilityRequest[] }>
}

export async function createAvailabilityRequest(input: {
  medicineName: string
  notes?: string
  isDelivery?: boolean
  deliveryAddress?: string
  proxyName?: string
  proxyPhone?: string
}) {
  const response = await fetch(`${apiBaseUrl}/api/availability-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error("Unable to submit availability request")
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
