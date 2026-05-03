import type { FastifyPluginAsync } from "fastify"
import { z } from "zod"

const searchQuery = z.object({
  q: z.string().default(""),
  neighborhood: z.string().optional(),
  inStock: z.coerce.boolean().optional(),
})

const demoResults = [
  {
    id: "amoxicillin-lion",
    medicine: "Amoxicillin Capsules 500mg",
    category: "Antibiotic",
    pharmacy: "Lion Pharmacy",
    neighborhood: "Bole",
    distanceMeters: 420,
    priceEtb: 185,
    stockStatus: "in_stock",
    deliveryAvailable: true,
    updatedAt: "24 minutes ago",
  },
  {
    id: "metformin-wudassie",
    medicine: "Metformin 850mg",
    category: "Antidiabetic",
    pharmacy: "Wudassie Pharmacy",
    neighborhood: "Kazanchis",
    distanceMeters: 900,
    priceEtb: 82.5,
    stockStatus: "low_stock",
    deliveryAvailable: false,
    updatedAt: "2 hours ago",
  },
]

export const catalogRoutes: FastifyPluginAsync = async (app) => {
  app.get("/medicines/search", async (request) => {
    const query = searchQuery.parse(request.query)
    const normalized = query.q.toLowerCase()

    return {
      query,
      results: demoResults.filter((item) => {
        const matchesName = item.medicine.toLowerCase().includes(normalized)
        const matchesNeighborhood = query.neighborhood
          ? item.neighborhood.toLowerCase() === query.neighborhood.toLowerCase()
          : true
        const matchesStock = query.inStock ? item.stockStatus !== "out_of_stock" : true

        return matchesName && matchesNeighborhood && matchesStock
      }),
    }
  })
}
