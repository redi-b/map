import type { FastifyPluginAsync } from "fastify"
import { requireProfile } from "../lib/auth-context.js"
import {
  createPrescription,
  listPrescriptions,
  listPharmacyPrescriptions,
  reviewPrescription,
  getPrescription,
} from "../services/prescription.js"
import { getPharmacyForStaff } from "../services/inventory.js"
import {
  createPrescriptionSchema,
  reviewPrescriptionSchema,
} from "../validators/prescription.js"

export const prescriptionRoutes: FastifyPluginAsync = async (app) => {
  /** POST /prescriptions — patient submits a prescription. */
  app.post("/prescriptions", async (request, reply) => {
    const context = await requireProfile(request, reply, ["patient"])
    if (!context) return

    const parsed = createPrescriptionSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid data", details: parsed.error.flatten().fieldErrors })
    }

    // TODO: handle image upload (multipart) in a follow-up
    const rx = await createPrescription(context.profile.id, parsed.data)
    return reply.status(201).send(rx)
  })

  /** GET /prescriptions — patient lists their prescriptions. */
  app.get("/prescriptions", async (request, reply) => {
    const context = await requireProfile(request, reply, ["patient"])
    if (!context) return

    return { prescriptions: await listPrescriptions(context.profile.id) }
  })

  /** GET /prescriptions/pharmacy — pharmacist lists prescriptions for their pharmacy. */
  app.get("/prescriptions/pharmacy", async (request, reply) => {
    const context = await requireProfile(request, reply, ["pharmacist"])
    if (!context) return

    const pharmacyId = await getPharmacyForStaff(context.profile.id)
    if (!pharmacyId) {
      return reply.status(404).send({ error: "No pharmacy assigned" })
    }

    return { prescriptions: await listPharmacyPrescriptions(pharmacyId) }
  })

  /** POST /prescriptions/:id/review — pharmacist reviews a prescription. */
  app.post("/prescriptions/:id/review", async (request, reply) => {
    const context = await requireProfile(request, reply, ["pharmacist"])
    if (!context) return

    const { id } = request.params as { id: string }
    const parsed = reviewPrescriptionSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid data", details: parsed.error.flatten().fieldErrors })
    }

    // Verify prescription belongs to pharmacist's pharmacy
    const pharmacyId = await getPharmacyForStaff(context.profile.id)
    if (!pharmacyId) {
      return reply.status(404).send({ error: "No pharmacy assigned" })
    }

    const rx = await getPrescription(id)
    if (!rx || rx.pharmacyId !== pharmacyId) {
      return reply.status(404).send({ error: "Prescription not found" })
    }

    const review = await reviewPrescription(id, context.profile.id, parsed.data)
    return reply.status(201).send(review)
  })
}
