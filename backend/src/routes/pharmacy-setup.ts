import type { FastifyPluginAsync } from "fastify"
import { requireProfile } from "../lib/auth-context.js"
import {
  assignPharmacyToStaff,
  getPharmacySetupState,
} from "../services/pharmacy-setup.js"
import { assignPharmacySchema } from "../validators/pharmacy.js"

export const pharmacySetupRoutes: FastifyPluginAsync = async (app) => {
  app.get("/pharmacy/setup", async (request, reply) => {
    const context = await requireProfile(request, reply, ["pharmacist"])
    if (!context) return

    return getPharmacySetupState(context.profile.id)
  })

  app.post("/pharmacy/setup", async (request, reply) => {
    const context = await requireProfile(request, reply, ["pharmacist"])
    if (!context) return

    const parsed = assignPharmacySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid data", details: parsed.error.flatten().fieldErrors })
    }

    const state = await assignPharmacyToStaff(context.profile.id, parsed.data)
    if (!state) {
      return reply.status(404).send({ error: "Pharmacy not found" })
    }

    return state
  })
}
