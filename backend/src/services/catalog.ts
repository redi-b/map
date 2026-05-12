import { and, asc, desc, eq, ilike, lte, ne, or } from "drizzle-orm"
import { db } from "../db/client.js"
import { inventoryItems, medicines, pharmacies } from "../db/schema.js"
import type { MedicineSearchQuery, MedicineSuggestionQuery } from "../validators/search.js"

function formatMedicineName(row: { name: string; form: string; strength: string | null }) {
  return [row.name, row.form, row.strength].filter(Boolean).join(" ")
}

function formatUpdatedAt(date: Date) {
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000))

  if (minutes < 60) {
    return `${minutes} min ago`
  }

  const hours = Math.round(minutes / 60)

  if (hours < 24) {
    return `${hours} hr ago`
  }

  const days = Math.round(hours / 24)
  return `${days}d ago`
}

/**
 * Placeholder distance estimate. In production, this would use lat/lng
 * from the user's location and the pharmacy's coordinates.
 */
function estimateDistanceMeters(neighborhood: string) {
  const distanceByNeighborhood: Record<string, number> = {
    bole: 420,
    kazanchis: 900,
    piazza: 1800,
    arada: 2100,
    "4 kilo": 1500,
    "6 kilo": 1700,
    megenagna: 1200,
    mexico: 1400,
    sarbet: 800,
  }

  return distanceByNeighborhood[neighborhood.toLowerCase()] ?? 1500
}

export async function searchMedicines(query: MedicineSearchQuery) {
  const normalized = query.q.trim()
  const filters = []

  if (normalized) {
    const pattern = `%${normalized}%`

    filters.push(
      or(
        ilike(medicines.name, pattern),
        ilike(medicines.form, pattern),
        ilike(medicines.strength, pattern),
        ilike(medicines.category, pattern),
        ilike(pharmacies.name, pattern)
      )
    )
  }

  if (query.neighborhood) {
    filters.push(ilike(pharmacies.neighborhood, query.neighborhood))
  }

  if (query.inStock) {
    filters.push(ne(inventoryItems.stockStatus, "out_of_stock"))
  }

  if (query.maxPrice) {
    filters.push(lte(inventoryItems.unitPriceEtb, String(query.maxPrice)))
  }

  // Only show verified pharmacies in patient search results
  filters.push(eq(pharmacies.isVerified, true))

  const where = filters.length === 1 ? filters[0] : filters.length > 1 ? and(...filters) : undefined

  const selectQuery = db
    .select({
      id: inventoryItems.id,
      medicineName: medicines.name,
      medicineForm: medicines.form,
      medicineStrength: medicines.strength,
      category: medicines.category,
      pharmacy: pharmacies.name,
      pharmacyBranch: pharmacies.branchName,
      neighborhood: pharmacies.neighborhood,
      unitPriceEtb: inventoryItems.unitPriceEtb,
      stockStatus: inventoryItems.stockStatus,
      quantity: inventoryItems.quantity,
      updatedAt: inventoryItems.updatedAt,
    })
    .from(inventoryItems)
    .innerJoin(medicines, eq(inventoryItems.medicineId, medicines.id))
    .innerJoin(pharmacies, eq(inventoryItems.pharmacyId, pharmacies.id))
    .orderBy(desc(inventoryItems.updatedAt))
    .limit(query.limit)

  const rows = where ? await selectQuery.where(where) : await selectQuery

  return {
    query: {
      q: query.q,
      neighborhood: query.neighborhood,
      inStock: query.inStock,
    },
    results: rows.map((row) => ({
      id: row.id,
      medicine: formatMedicineName({
        name: row.medicineName,
        form: row.medicineForm,
        strength: row.medicineStrength,
      }),
      category: row.category,
      pharmacy: row.pharmacyBranch
        ? `${row.pharmacy} — ${row.pharmacyBranch}`
        : row.pharmacy,
      neighborhood: row.neighborhood,
      distanceMeters: estimateDistanceMeters(row.neighborhood),
      priceEtb: Number(row.unitPriceEtb),
      stockStatus: row.stockStatus,
      deliveryAvailable: row.quantity > 0,
      updatedAt: formatUpdatedAt(row.updatedAt),
    })),
  }
}

export async function getMedicineSuggestions(query: MedicineSuggestionQuery) {
  const normalized = query.q.trim()

  if (normalized.length < 2) {
    return []
  }

  const pattern = `%${normalized}%`
  const rows = await db
    .selectDistinct({
      name: medicines.name,
      form: medicines.form,
      strength: medicines.strength,
      category: medicines.category,
    })
    .from(medicines)
    .innerJoin(inventoryItems, eq(inventoryItems.medicineId, medicines.id))
    .innerJoin(pharmacies, eq(inventoryItems.pharmacyId, pharmacies.id))
    .where(
      and(
        eq(pharmacies.isVerified, true),
        or(
          ilike(medicines.name, pattern),
          ilike(medicines.form, pattern),
          ilike(medicines.strength, pattern),
          ilike(medicines.category, pattern),
        ),
      ),
    )
    .orderBy(asc(medicines.name))
    .limit(query.limit)

  return rows.map((row) => ({
    medicine: formatMedicineName(row),
    category: row.category,
    query: row.name,
  }))
}

/** Return the list of unique neighborhoods that have pharmacies. */
export async function getNeighborhoods() {
  const rows = await db
    .selectDistinct({ neighborhood: pharmacies.neighborhood })
    .from(pharmacies)
    .where(eq(pharmacies.isVerified, true))
    .orderBy(pharmacies.neighborhood)

  return rows.map((r) => r.neighborhood)
}
