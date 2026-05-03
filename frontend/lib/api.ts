const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

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
