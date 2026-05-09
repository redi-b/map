import type { FastifyPluginAsync } from "fastify"
import { requireProfile } from "../lib/auth-context.js"
import { searchMedicines, getNeighborhoods } from "../services/catalog.js"
import { medicineSearchQuery } from "../validators/search.js"

export const catalogRoutes: FastifyPluginAsync = async (app) => {
  app.get("/medicines/search", async (request, reply) => {
    const context = await requireProfile(request, reply, ["patient"])

    if (!context) {
      return
    }

    const query = medicineSearchQuery.parse(request.query)
    return searchMedicines(query)
  })

  app.get("/medicines/neighborhoods", async (request, reply) => {
    const context = await requireProfile(request, reply, ["patient"])

    if (!context) {
      return
    }

    return { neighborhoods: await getNeighborhoods() }
  })
}
