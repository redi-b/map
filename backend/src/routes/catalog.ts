import { and, desc, eq, ilike, ne, or } from "drizzle-orm"
import type { FastifyPluginAsync } from "fastify"
import { z } from "zod"
import { db } from "../db/client.js"
import { inventoryItems, medicines, pharmacies } from "../db/schema.js"
import { requireProfile } from "../lib/auth-context.js"

const searchQuery = z.object({
  q: z.string().default(""),
  neighborhood: z.string().optional(),
  inStock: z.coerce.boolean().optional(),
})

function formatMedicineName(row: { name: string; form: string; strength: string | null }) {
  return [row.name, row.form, row.strength].filter(Boolean).join(" ")
}

function formatUpdatedAt(date: Date) {
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000))

  if (minutes < 60) {
    return `${minutes} min ago`
  }

  const hours = Math.round(minutes / 60)
  return `${hours} hr ago`
}

function estimateDistanceMeters(neighborhood: string) {
  const distanceByNeighborhood: Record<string, number> = {
    bole: 420,
    kazanchis: 900,
    piazza: 1800,
  }

  return distanceByNeighborhood[neighborhood.toLowerCase()] ?? 1500
}

export const catalogRoutes: FastifyPluginAsync = async (app) => {
  app.get("/medicines/search", async (request, reply) => {
    const context = await requireProfile(request, reply, ["patient"])

    if (!context) {
      return
    }

    const query = searchQuery.parse(request.query)
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

    const where = filters.length === 1 ? filters[0] : filters.length > 1 ? and(...filters) : undefined
    const selectQuery = db
      .select({
        id: inventoryItems.id,
        medicineName: medicines.name,
        medicineForm: medicines.form,
        medicineStrength: medicines.strength,
        category: medicines.category,
        pharmacy: pharmacies.name,
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
      .limit(25)

    const rows = where ? await selectQuery.where(where) : await selectQuery

    return {
      query,
      results: rows.map((row) => ({
        id: row.id,
        medicine: formatMedicineName({
          name: row.medicineName,
          form: row.medicineForm,
          strength: row.medicineStrength,
        }),
        category: row.category,
        pharmacy: row.pharmacy,
        neighborhood: row.neighborhood,
        distanceMeters: estimateDistanceMeters(row.neighborhood),
        priceEtb: Number(row.unitPriceEtb),
        stockStatus: row.stockStatus,
        deliveryAvailable: row.quantity > 0,
        updatedAt: formatUpdatedAt(row.updatedAt),
      })),
    }
  })
}
