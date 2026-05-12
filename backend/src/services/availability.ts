import { and, desc, eq } from "drizzle-orm"
import { db } from "../db/client.js"
import {
  availabilityRequests,
  requestResponses,
  pharmacies,
  profiles,
} from "../db/schema.js"
import type { CreateAvailabilityRequestInput, RespondToRequestInput } from "../validators/prescription.js"
import { createNotification } from "./notification.js"

export async function createAvailabilityRequest(
  patientProfileId: string,
  input: CreateAvailabilityRequestInput,
) {
  const [request] = await db
    .insert(availabilityRequests)
    .values({
      patientProfileId,
      pharmacyId: input.pharmacyId ?? null,
      medicineName: input.medicineName,
      notes: input.notes ?? null,
      isDelivery: input.isDelivery,
      deliveryAddress: input.deliveryAddress ?? null,
      proxyName: input.proxyName ?? null,
      proxyPhone: input.proxyPhone ?? null,
    })
    .returning()

  await createNotification(
    patientProfileId,
    `Your availability request for ${input.medicineName} has been submitted.`,
    "availability_request",
    request.id,
  )

  return request
}

export async function listPatientRequests(patientProfileId: string) {
  const rows = await db
    .select({
      id: availabilityRequests.id,
      medicineName: availabilityRequests.medicineName,
      status: availabilityRequests.status,
      notes: availabilityRequests.notes,
      isDelivery: availabilityRequests.isDelivery,
      proxyName: availabilityRequests.proxyName,
      createdAt: availabilityRequests.createdAt,
      pharmacyName: pharmacies.name,
    })
    .from(availabilityRequests)
    .leftJoin(pharmacies, eq(availabilityRequests.pharmacyId, pharmacies.id))
    .where(eq(availabilityRequests.patientProfileId, patientProfileId))
    .orderBy(desc(availabilityRequests.createdAt))

  return rows.map((r) => ({
    id: r.id,
    medicineName: r.medicineName,
    status: r.status,
    notes: r.notes,
    isDelivery: r.isDelivery,
    proxyName: r.proxyName,
    pharmacy: r.pharmacyName ?? "All pharmacies",
    createdAt: r.createdAt.toISOString(),
  }))
}

/** Pharmacist: list requests for their pharmacy. */
export async function listPharmacyRequests(pharmacyId: string) {
  const rows = await db
    .select({
      id: availabilityRequests.id,
      medicineName: availabilityRequests.medicineName,
      status: availabilityRequests.status,
      notes: availabilityRequests.notes,
      isDelivery: availabilityRequests.isDelivery,
      proxyName: availabilityRequests.proxyName,
      createdAt: availabilityRequests.createdAt,
      patientName: profiles.fullName,
    })
    .from(availabilityRequests)
    .innerJoin(profiles, eq(availabilityRequests.patientProfileId, profiles.id))
    .where(eq(availabilityRequests.pharmacyId, pharmacyId))
    .orderBy(desc(availabilityRequests.createdAt))

  return rows.map((r) => ({
    id: r.id,
    medicineName: r.medicineName,
    status: r.status,
    notes: r.notes,
    isDelivery: r.isDelivery,
    proxyName: r.proxyName,
    patientName: r.patientName,
    createdAt: r.createdAt.toISOString(),
  }))
}

export async function respondToRequest(
  requestId: string,
  pharmacyId: string,
  responderProfileId: string,
  input: RespondToRequestInput,
) {
  const [request] = await db
    .select({
      id: availabilityRequests.id,
      patientProfileId: availabilityRequests.patientProfileId,
      medicineName: availabilityRequests.medicineName,
    })
    .from(availabilityRequests)
    .where(and(eq(availabilityRequests.id, requestId), eq(availabilityRequests.pharmacyId, pharmacyId)))
    .limit(1)

  if (!request) {
    return null
  }

  const [response] = await db
    .insert(requestResponses)
    .values({
      requestId,
      pharmacyId,
      responderProfileId,
      response: input.response,
      alternativeMedicineName: input.alternativeMedicineName ?? null,
      estimatedPriceEtb: input.estimatedPriceEtb ? String(input.estimatedPriceEtb) : null,
      notes: input.notes ?? null,
    })
    .returning()

  // Update request status
  const newStatus = input.response === "available" ? "approved" : input.response === "not_available" ? "rejected" : "under_review"
  await db
    .update(availabilityRequests)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(and(eq(availabilityRequests.id, requestId), eq(availabilityRequests.pharmacyId, pharmacyId)))

  const responseLabel = input.response === "available" ? "is available" : input.response === "not_available" ? "is not available" : "has an alternative"
  await createNotification(
    request.patientProfileId,
    `${request.medicineName} ${responseLabel} at the pharmacy. ${input.notes ?? ""}`.trim(),
    "availability_request",
    requestId,
  )

  return response
}
