const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

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
