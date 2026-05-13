import type { FastifyPluginAsync, FastifyRequest } from "fastify"
import { requireProfile } from "../lib/auth-context.js"
import { writeAuditLog } from "../services/audit.js"
import {
  createPrescription,
  listVerifiedPrescriptionPharmacies,
  listPrescriptions,
  listPharmacyPrescriptions,
  reviewPrescription,
  getPrescription,
} from "../services/prescription.js"
import { getPharmacyForStaff } from "../services/inventory.js"
import { readEncryptedPrescriptionImage, storeEncryptedPrescriptionImage } from "../storage/prescription-images.js"
import {
  createPrescriptionSchema,
  reviewPrescriptionSchema,
} from "../validators/prescription.js"

async function readMultipartPrescription(request: FastifyRequest) {
  const fields: Record<string, string> = {}
  let image: { buffer: Buffer; mimeType: string; originalFilename: string } | null = null

  for await (const part of request.parts()) {
    if (part.type === "file") {
      if (part.fieldname !== "image") {
        part.file.resume()
        continue
      }

      const chunks: Buffer[] = []
      for await (const chunk of part.file) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      }

      image = {
        buffer: Buffer.concat(chunks),
        mimeType: part.mimetype,
        originalFilename: part.filename,
      }
    } else {
      fields[part.fieldname] = String(part.value ?? "")
    }
  }

  return { fields, image }
}

export const prescriptionRoutes: FastifyPluginAsync = async (app) => {
  /** GET /prescriptions/pharmacies — patient lists pharmacies that accept prescriptions. */
  app.get("/prescriptions/pharmacies", async (request, reply) => {
    const context = await requireProfile(request, reply, ["patient"])
    if (!context) return

    return { pharmacies: await listVerifiedPrescriptionPharmacies() }
  })

  /** POST /prescriptions — patient submits a prescription. */
  app.post("/prescriptions", async (request, reply) => {
    const context = await requireProfile(request, reply, ["patient"])
    if (!context) return

    const isMultipart = request.headers["content-type"]?.includes("multipart/form-data")
    const body = isMultipart ? await readMultipartPrescription(request) : { fields: request.body, image: null }
    const fields = (body.fields ?? {}) as Record<string, unknown>

    const parsed = createPrescriptionSchema.safeParse({
      ...fields,
      isDelivery: fields.isDelivery === "true" || fields.isDelivery === true,
    })

    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid data", details: parsed.error.flatten().fieldErrors })
    }

    if (isMultipart && !body.image) {
      return reply.status(400).send({ error: "Prescription image is required" })
    }

    try {
      const image = body.image ? await storeEncryptedPrescriptionImage(body.image) : undefined
      const rx = await createPrescription(context.profile.id, parsed.data, image)
      return reply.status(201).send(rx)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit prescription"
      return reply.status(400).send({ error: message })
    }
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

  /** GET /prescriptions/:id/image — authorized patient or pharmacist reads decrypted image. */
  app.get("/prescriptions/:id/image", async (request, reply) => {
    const context = await requireProfile(request, reply, ["patient", "pharmacist"])
    if (!context) return

    const { id } = request.params as { id: string }
    const rx = await getPrescription(id)
    if (!rx || !rx.imageUrl) {
      return reply.status(404).send({ error: "Prescription image not found" })
    }

    if (context.profile.role === "patient" && rx.patientProfileId !== context.profile.id) {
      return reply.status(404).send({ error: "Prescription image not found" })
    }

    if (context.profile.role === "pharmacist") {
      const pharmacyId = await getPharmacyForStaff(context.profile.id)
      if (!pharmacyId || rx.pharmacyId !== pharmacyId) {
        return reply.status(404).send({ error: "Prescription image not found" })
      }
    }

    const image = await readEncryptedPrescriptionImage(rx.imageUrl)
    const filename = image.originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_") || "prescription-image"

    return reply
      .type(image.mimeType)
      .header("Cache-Control", "private, no-store")
      .header("Content-Disposition", `inline; filename="${filename}"`)
      .send(image.buffer)
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
    await writeAuditLog({
      actorProfileId: context.profile.id,
      action: "prescription.review",
      entityType: "prescription",
      entityId: id,
      details: {
        action: parsed.data.action,
        pharmacyId,
        estimatedCostEtb: parsed.data.estimatedCostEtb,
        hasInstructions: Boolean(parsed.data.instructions),
        alternativeMedicineId: parsed.data.alternativeMedicineId,
      },
    })
    return reply.status(201).send(review)
  })
}
