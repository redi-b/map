import { and, asc, eq, ilike, lte, ne, or } from "drizzle-orm"
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

type Coordinates = {
  latitude: number
  longitude: number
}

const neighborhoodCenters: Record<string, Coordinates> = {
  bole: { latitude: 8.9965, longitude: 38.7898 },
  kazanchis: { latitude: 9.0183, longitude: 38.7636 },
  piazza: { latitude: 9.0357, longitude: 38.7513 },
  arada: { latitude: 9.035, longitude: 38.752 },
  "4 kilo": { latitude: 9.0335, longitude: 38.7612 },
  "6 kilo": { latitude: 9.042, longitude: 38.761 },
  megenagna: { latitude: 9.0121, longitude: 38.8012 },
  mexico: { latitude: 9.0104, longitude: 38.7436 },
  sarbet: { latitude: 8.9956, longitude: 38.7357 },
}

const defaultSearchCenter = neighborhoodCenters.bole

function parseCoordinates(latitude: string | null, longitude: string | null) {
  const parsedLatitude = Number(latitude)
  const parsedLongitude = Number(longitude)

  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
    return null
  }

  return { latitude: parsedLatitude, longitude: parsedLongitude }
}

function getNeighborhoodCenter(neighborhood?: string | null) {
  if (!neighborhood) return null
  return neighborhoodCenters[neighborhood.toLowerCase()] ?? null
}

function haversineMeters(origin: Coordinates, destination: Coordinates) {
  const earthRadiusMeters = 6_371_000
  const toRadians = (value: number) => (value * Math.PI) / 180
  const latitudeDelta = toRadians(destination.latitude - origin.latitude)
  const longitudeDelta = toRadians(destination.longitude - origin.longitude)
  const originLatitude = toRadians(origin.latitude)
  const destinationLatitude = toRadians(destination.latitude)

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return Math.round(earthRadiusMeters * c)
}

function estimateDistanceMeters(row: {
  latitude: string | null
  longitude: string | null
  neighborhood: string
}, origin: Coordinates) {
  const destination =
    parseCoordinates(row.latitude, row.longitude) ??
    getNeighborhoodCenter(row.neighborhood)

  if (!destination) {
    return 1500
  }

  return haversineMeters(origin, destination)
}

function getSearchOrigin(query: MedicineSearchQuery) {
  if (query.latitude !== undefined && query.longitude !== undefined) {
    return { latitude: query.latitude, longitude: query.longitude }
  }

  return getNeighborhoodCenter(query.neighborhood) ?? defaultSearchCenter
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

  if (query.delivery) {
    filters.push(eq(pharmacies.supportsDelivery, true))
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
      pharmacyId: pharmacies.id,
      pharmacy: pharmacies.name,
      pharmacyBranch: pharmacies.branchName,
      pharmacyPhone: pharmacies.phone,
      pharmacyEmail: pharmacies.email,
      neighborhood: pharmacies.neighborhood,
      latitude: pharmacies.latitude,
      longitude: pharmacies.longitude,
      supportsDelivery: pharmacies.supportsDelivery,
      unitPriceEtb: inventoryItems.unitPriceEtb,
      stockStatus: inventoryItems.stockStatus,
      quantity: inventoryItems.quantity,
      expiresAt: inventoryItems.expiresAt,
      updatedAt: inventoryItems.updatedAt,
    })
    .from(inventoryItems)
    .innerJoin(medicines, eq(inventoryItems.medicineId, medicines.id))
    .innerJoin(pharmacies, eq(inventoryItems.pharmacyId, pharmacies.id))

  const rows = where ? await selectQuery.where(where) : await selectQuery

  const origin = getSearchOrigin(query)
  const results = rows.map((row) => ({
    id: row.id,
    medicine: formatMedicineName({
      name: row.medicineName,
      form: row.medicineForm,
      strength: row.medicineStrength,
    }),
    category: row.category,
    pharmacyId: row.pharmacyId,
    pharmacy: row.pharmacyBranch
      ? `${row.pharmacy} - ${row.pharmacyBranch}`
      : row.pharmacy,
    pharmacyPhone: row.pharmacyPhone,
    pharmacyEmail: row.pharmacyEmail,
    neighborhood: row.neighborhood,
    distanceMeters: estimateDistanceMeters({
      latitude: row.latitude,
      longitude: row.longitude,
      neighborhood: row.neighborhood,
    }, origin),
    priceEtb: Number(row.unitPriceEtb),
    stockStatus: row.stockStatus,
    quantity: row.quantity,
    deliveryAvailable: row.supportsDelivery,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    updatedAt: formatUpdatedAt(row.updatedAt),
  })).sort((a, b) => a.distanceMeters - b.distanceMeters || a.priceEtb - b.priceEtb)

  return {
    query: {
      q: query.q,
      neighborhood: query.neighborhood,
      inStock: query.inStock,
      latitude: query.latitude,
    longitude: query.longitude,
    delivery: query.delivery,
    maxPrice: query.maxPrice,
    },
    results: results.slice(0, query.limit),
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
