import type { FastifyPluginAsync } from "fastify"
import { requireProfile } from "../lib/auth-context.js"
import {
  createAvailabilityRequest,
  listPatientRequests,
  listPharmacyRequests,
  respondToRequest,
} from "../services/availability.js"
import { getPharmacyForStaff } from "../services/inventory.js"
import {
  createAvailabilityRequestSchema,
  respondToRequestSchema,
} from "../validators/prescription.js"

export const availabilityRoutes: FastifyPluginAsync = async (app) => {
  /** POST /availability-requests — patient creates a stock request. */
  app.post("/availability-requests", async (request, reply) => {
    const context = await requireProfile(request, reply, ["patient"])
    if (!context) return

    const parsed = createAvailabilityRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid data", details: parsed.error.flatten().fieldErrors })
    }

    const req = await createAvailabilityRequest(context.profile.id, parsed.data)
    return reply.status(201).send(req)
  })

  /** GET /availability-requests — patient lists their requests. */
  app.get("/availability-requests", async (request, reply) => {
    const context = await requireProfile(request, reply, ["patient"])
    if (!context) return

    return { requests: await listPatientRequests(context.profile.id) }
  })

  /** GET /availability-requests/pharmacy — pharmacist lists requests for their pharmacy. */
  app.get("/availability-requests/pharmacy", async (request, reply) => {
    const context = await requireProfile(request, reply, ["pharmacist"])
    if (!context) return

    const pharmacyId = await getPharmacyForStaff(context.profile.id)
    if (!pharmacyId) {
      return reply.status(404).send({ error: "No pharmacy assigned" })
    }

    return { requests: await listPharmacyRequests(pharmacyId) }
  })

  /** POST /availability-requests/:id/respond — pharmacist responds to a request. */
  app.post("/availability-requests/:id/respond", async (request, reply) => {
    const context = await requireProfile(request, reply, ["pharmacist"])
    if (!context) return

    const pharmacyId = await getPharmacyForStaff(context.profile.id)
    if (!pharmacyId) {
      return reply.status(404).send({ error: "No pharmacy assigned" })
    }

    const { id } = request.params as { id: string }
    const parsed = respondToRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid data", details: parsed.error.flatten().fieldErrors })
    }

    const response = await respondToRequest(id, pharmacyId, context.profile.id, parsed.data)
    return reply.status(201).send(response)
  })
}
