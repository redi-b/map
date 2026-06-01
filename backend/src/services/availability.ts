import { and, desc, eq, inArray, isNull, or } from "drizzle-orm"
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
  let selectedPharmacy: { name: string; branchName: string | null; supportsDelivery: boolean } | null = null

  if (input.pharmacyId) {
    const [pharmacy] = await db
      .select({
        name: pharmacies.name,
        branchName: pharmacies.branchName,
        supportsDelivery: pharmacies.supportsDelivery,
      })
      .from(pharmacies)
      .where(and(eq(pharmacies.id, input.pharmacyId), eq(pharmacies.isVerified, true)))
      .limit(1)

    if (!pharmacy) {
      throw new Error("Selected pharmacy is not available")
    }

    if (input.isDelivery && !pharmacy.supportsDelivery) {
      throw new Error("Selected pharmacy does not offer delivery")
    }

    selectedPharmacy = pharmacy
  }

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

  const destination = selectedPharmacy
    ? selectedPharmacy.branchName
      ? `${selectedPharmacy.name} - ${selectedPharmacy.branchName}`
      : selectedPharmacy.name
    : input.isDelivery
      ? "delivery-capable pharmacies"
      : "verified pharmacies"

  await createNotification(
    patientProfileId,
    `Your availability request for ${input.medicineName} has been submitted to ${destination}.`,
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
      deliveryAddress: availabilityRequests.deliveryAddress,
      proxyName: availabilityRequests.proxyName,
      proxyPhone: availabilityRequests.proxyPhone,
      createdAt: availabilityRequests.createdAt,
      pharmacyName: pharmacies.name,
      pharmacyBranchName: pharmacies.branchName,
    })
    .from(availabilityRequests)
    .leftJoin(pharmacies, eq(availabilityRequests.pharmacyId, pharmacies.id))
    .where(eq(availabilityRequests.patientProfileId, patientProfileId))
    .orderBy(desc(availabilityRequests.createdAt))

  const requestIds = rows.map((row) => row.id)
  const responses = requestIds.length
    ? await db
      .select({
        requestId: requestResponses.requestId,
        response: requestResponses.response,
        alternativeMedicineName: requestResponses.alternativeMedicineName,
        estimatedPriceEtb: requestResponses.estimatedPriceEtb,
        notes: requestResponses.notes,
        createdAt: requestResponses.createdAt,
        pharmacyName: pharmacies.name,
        pharmacyBranchName: pharmacies.branchName,
      })
      .from(requestResponses)
      .innerJoin(pharmacies, eq(requestResponses.pharmacyId, pharmacies.id))
      .where(inArray(requestResponses.requestId, requestIds))
      .orderBy(desc(requestResponses.createdAt))
    : []

  const latestResponseByRequestId = new Map<string, (typeof responses)[number]>()
  for (const response of responses) {
    if (!latestResponseByRequestId.has(response.requestId)) {
      latestResponseByRequestId.set(response.requestId, response)
    }
  }

  return rows.map((r) => ({
    id: r.id,
    medicineName: r.medicineName,
    status: r.status,
    notes: r.notes,
    isDelivery: r.isDelivery,
    deliveryAddress: r.deliveryAddress,
    proxyName: r.proxyName,
    proxyPhone: r.proxyPhone,
    pharmacy: r.pharmacyName
      ? (r.pharmacyBranchName ? `${r.pharmacyName} - ${r.pharmacyBranchName}` : r.pharmacyName)
      : r.isDelivery ? "Delivery-capable pharmacies" : "All verified pharmacies",
    latestResponse: latestResponseByRequestId.has(r.id)
      ? {
        response: latestResponseByRequestId.get(r.id)!.response,
        pharmacy: latestResponseByRequestId.get(r.id)!.pharmacyBranchName
          ? `${latestResponseByRequestId.get(r.id)!.pharmacyName} - ${latestResponseByRequestId.get(r.id)!.pharmacyBranchName}`
          : latestResponseByRequestId.get(r.id)!.pharmacyName,
        alternativeMedicineName: latestResponseByRequestId.get(r.id)!.alternativeMedicineName,
        estimatedPriceEtb: latestResponseByRequestId.get(r.id)!.estimatedPriceEtb
          ? Number(latestResponseByRequestId.get(r.id)!.estimatedPriceEtb)
          : null,
        notes: latestResponseByRequestId.get(r.id)!.notes,
        createdAt: latestResponseByRequestId.get(r.id)!.createdAt.toISOString(),
      }
      : null,
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
      deliveryAddress: availabilityRequests.deliveryAddress,
      proxyName: availabilityRequests.proxyName,
      proxyPhone: availabilityRequests.proxyPhone,
      createdAt: availabilityRequests.createdAt,
      patientName: profiles.fullName,
    })
    .from(availabilityRequests)
    .innerJoin(pharmacies, eq(pharmacies.id, pharmacyId))
    .innerJoin(profiles, eq(availabilityRequests.patientProfileId, profiles.id))
    .where(
      and(
        or(eq(availabilityRequests.pharmacyId, pharmacyId), isNull(availabilityRequests.pharmacyId)),
        or(eq(availabilityRequests.isDelivery, false), eq(pharmacies.supportsDelivery, true)),
      ),
    )
    .orderBy(desc(availabilityRequests.createdAt))

  return rows.map((r) => ({
    id: r.id,
    medicineName: r.medicineName,
    status: r.status,
    notes: r.notes,
    isDelivery: r.isDelivery,
    deliveryAddress: r.deliveryAddress,
    proxyName: r.proxyName,
    proxyPhone: r.proxyPhone,
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
  const newStatus = input.response === "available" ? "approved" : input.response === "not_available" ? "rejected" : "under_review"
  const result = await db.transaction(async (tx) => {
    const [request] = await tx
      .update(availabilityRequests)
      .set({ pharmacyId, status: newStatus, updatedAt: new Date() })
      .where(
        and(
          eq(availabilityRequests.id, requestId),
          inArray(availabilityRequests.status, ["submitted", "under_review"]),
          or(eq(availabilityRequests.pharmacyId, pharmacyId), isNull(availabilityRequests.pharmacyId)),
        ),
      )
      .returning({
        id: availabilityRequests.id,
        patientProfileId: availabilityRequests.patientProfileId,
        medicineName: availabilityRequests.medicineName,
      })

    if (!request) {
      return null
    }

    const [response] = await tx
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

    return { request, response }
  })

  if (!result) {
    return null
  }

  const responseLabel = input.response === "available" ? "is available" : input.response === "not_available" ? "is not available" : "has an alternative"
  const [pharmacy] = await db
    .select({ name: pharmacies.name, branchName: pharmacies.branchName })
    .from(pharmacies)
    .where(eq(pharmacies.id, pharmacyId))
    .limit(1)
  const pharmacyLabel = pharmacy
    ? pharmacy.branchName
      ? `${pharmacy.name} - ${pharmacy.branchName}`
      : pharmacy.name
    : "the pharmacy"

  await createNotification(
    result.request.patientProfileId,
    `${pharmacyLabel} responded: ${result.request.medicineName} ${responseLabel}. ${input.notes ?? ""}`.trim(),
    "availability_request",
    requestId,
  )

  return result.response
}
