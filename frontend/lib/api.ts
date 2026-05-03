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

export async function searchMedicines(query: string) {
  const params = new URLSearchParams({ q: query })
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
    throw new Error("Unable to save profile")
  }

  return response.json()
}
