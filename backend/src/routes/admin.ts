import type { FastifyPluginAsync } from "fastify"
import { requireProfile } from "../lib/auth-context.js"
import {
  createAdminPharmacy,
  listAdminPharmacies,
  verifyAdminPharmacy,
} from "../services/admin.js"
import {
  createAdminPharmacySchema,
  verifyAdminPharmacySchema,
} from "../validators/admin.js"

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get("/admin/pharmacies", async (request, reply) => {
    const context = await requireProfile(request, reply, ["admin"])
    if (!context) return

    return { pharmacies: await listAdminPharmacies() }
  })

  app.post("/admin/pharmacies", async (request, reply) => {
    const context = await requireProfile(request, reply, ["admin"])
    if (!context) return

    const parsed = createAdminPharmacySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid data", details: parsed.error.flatten().fieldErrors })
    }

    return reply.status(201).send(await createAdminPharmacy(parsed.data))
  })

  app.patch("/admin/pharmacies/:id/verify", async (request, reply) => {
    const context = await requireProfile(request, reply, ["admin"])
    if (!context) return

    const { id } = request.params as { id: string }
    const parsed = verifyAdminPharmacySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid data", details: parsed.error.flatten().fieldErrors })
    }

    const pharmacy = await verifyAdminPharmacy(id, parsed.data)
    if (!pharmacy) {
      return reply.status(404).send({ error: "Pharmacy not found" })
    }

    return pharmacy
  })
}
