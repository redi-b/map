import { and, desc, eq, inArray } from "drizzle-orm"
import { db } from "../db/client.js"
import {
  prescriptions,
  prescriptionReviews,
  pharmacies,
  medicines,
  profiles,
} from "../db/schema.js"
import type { CreatePrescriptionInput, ReviewPrescriptionInput } from "../validators/prescription.js"
import { createNotification } from "./notification.js"

type PrescriptionImageMetadata = {
  imageUrl: string
  mimeType: string
}

export async function createPrescription(
  patientProfileId: string,
  input: CreatePrescriptionInput,
  image?: PrescriptionImageMetadata,
) {
  const [pharmacy] = await db
    .select({
      id: pharmacies.id,
      name: pharmacies.name,
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

  const [rx] = await db
    .insert(prescriptions)
    .values({
      patientProfileId,
      pharmacyId: input.pharmacyId,
      status: "uploaded",
      imageUrl: image?.imageUrl ?? null,
      imageMimeType: image?.mimeType ?? null,
      isDelivery: input.isDelivery,
      deliveryAddress: input.deliveryAddress ?? null,
      proxyName: input.proxyName ?? null,
      proxyPhone: input.proxyPhone ?? null,
      notes: input.notes ?? null,
    })
    .returning()

  // Notify pharmacy staff
  await createNotification(
    patientProfileId,
    `Prescription submitted to ${pharmacy.name}. We'll notify you when it's reviewed.`,
    "prescription",
    rx.id,
  )

  return rx
}

export async function listPrescriptions(patientProfileId: string) {
  const rows = await db
    .select({
      id: prescriptions.id,
      status: prescriptions.status,
      imageUrl: prescriptions.imageUrl,
      imageMimeType: prescriptions.imageMimeType,
      isDelivery: prescriptions.isDelivery,
      deliveryAddress: prescriptions.deliveryAddress,
      proxyName: prescriptions.proxyName,
      proxyPhone: prescriptions.proxyPhone,
      notes: prescriptions.notes,
      createdAt: prescriptions.createdAt,
      updatedAt: prescriptions.updatedAt,
      pharmacyName: pharmacies.name,
      pharmacyNeighborhood: pharmacies.neighborhood,
    })
    .from(prescriptions)
    .innerJoin(pharmacies, eq(prescriptions.pharmacyId, pharmacies.id))
    .where(eq(prescriptions.patientProfileId, patientProfileId))
    .orderBy(desc(prescriptions.createdAt))

  const prescriptionIds = rows.map((row) => row.id)
  const reviews = prescriptionIds.length
    ? await db
      .select({
        prescriptionId: prescriptionReviews.prescriptionId,
        action: prescriptionReviews.action,
        instructions: prescriptionReviews.instructions,
        estimatedCostEtb: prescriptionReviews.estimatedCostEtb,
        alternativeMedicineName: medicines.name,
        createdAt: prescriptionReviews.createdAt,
      })
      .from(prescriptionReviews)
      .leftJoin(medicines, eq(prescriptionReviews.alternativeMedicineId, medicines.id))
      .where(inArray(prescriptionReviews.prescriptionId, prescriptionIds))
      .orderBy(desc(prescriptionReviews.createdAt))
    : []

  const latestReviewByPrescriptionId = new Map<string, (typeof reviews)[number]>()
  for (const review of reviews) {
    if (!latestReviewByPrescriptionId.has(review.prescriptionId)) {
      latestReviewByPrescriptionId.set(review.prescriptionId, review)
    }
  }

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    imageUrl: r.imageUrl ? `/api/prescriptions/${r.id}/image` : null,
    imageMimeType: r.imageMimeType,
    isDelivery: r.isDelivery,
    deliveryAddress: r.deliveryAddress,
    proxyName: r.proxyName,
    proxyPhone: r.proxyPhone,
    notes: r.notes,
    pharmacy: r.pharmacyName,
    neighborhood: r.pharmacyNeighborhood,
    latestReview: latestReviewByPrescriptionId.has(r.id)
      ? {
        action: latestReviewByPrescriptionId.get(r.id)!.action,
        instructions: latestReviewByPrescriptionId.get(r.id)!.instructions,
        estimatedCostEtb: latestReviewByPrescriptionId.get(r.id)!.estimatedCostEtb
          ? Number(latestReviewByPrescriptionId.get(r.id)!.estimatedCostEtb)
          : null,
        alternativeMedicineName: latestReviewByPrescriptionId.get(r.id)!.alternativeMedicineName,
        createdAt: latestReviewByPrescriptionId.get(r.id)!.createdAt.toISOString(),
      }
      : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))
}

/** Pharmacist: list prescriptions assigned to their pharmacy. */
export async function listPharmacyPrescriptions(pharmacyId: string) {
  const rows = await db
    .select({
      id: prescriptions.id,
      status: prescriptions.status,
      imageUrl: prescriptions.imageUrl,
      imageMimeType: prescriptions.imageMimeType,
      isDelivery: prescriptions.isDelivery,
      deliveryAddress: prescriptions.deliveryAddress,
      proxyName: prescriptions.proxyName,
      proxyPhone: prescriptions.proxyPhone,
      notes: prescriptions.notes,
      createdAt: prescriptions.createdAt,
      patientName: profiles.fullName,
    })
    .from(prescriptions)
    .innerJoin(profiles, eq(prescriptions.patientProfileId, profiles.id))
    .where(eq(prescriptions.pharmacyId, pharmacyId))
    .orderBy(desc(prescriptions.createdAt))

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    imageUrl: r.imageUrl ? `/api/prescriptions/${r.id}/image` : null,
    imageMimeType: r.imageMimeType,
    isDelivery: r.isDelivery,
    deliveryAddress: r.deliveryAddress,
    proxyName: r.proxyName,
    proxyPhone: r.proxyPhone,
    notes: r.notes,
    patientName: r.patientName,
    createdAt: r.createdAt.toISOString(),
  }))
}

export async function reviewPrescription(
  prescriptionId: string,
  reviewerProfileId: string,
  input: ReviewPrescriptionInput,
) {
  // Update prescription status
  const newStatus = input.action === "approve" ? "verified" : input.action === "reject" ? "rejected" : "under_review"

  await db
    .update(prescriptions)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(prescriptions.id, prescriptionId))

  // Create review record
  const [review] = await db
    .insert(prescriptionReviews)
    .values({
      prescriptionId,
      reviewerProfileId,
      action: input.action,
      instructions: input.instructions ?? null,
      estimatedCostEtb: input.estimatedCostEtb ? String(input.estimatedCostEtb) : null,
      alternativeMedicineId: input.alternativeMedicineId ?? null,
    })
    .returning()

  // Notify patient
  const [rx] = await db
    .select({
      patientProfileId: prescriptions.patientProfileId,
      pharmacyName: pharmacies.name,
      pharmacyBranchName: pharmacies.branchName,
    })
    .from(prescriptions)
    .innerJoin(pharmacies, eq(prescriptions.pharmacyId, pharmacies.id))
    .where(eq(prescriptions.id, prescriptionId))
    .limit(1)

  if (rx) {
    const actionLabel = input.action === "approve" ? "approved" : input.action === "reject" ? "rejected" : "updated"
    const pharmacyLabel = rx.pharmacyBranchName ? `${rx.pharmacyName} - ${rx.pharmacyBranchName}` : rx.pharmacyName
    await createNotification(
      rx.patientProfileId,
      `${pharmacyLabel} ${actionLabel} your prescription. ${input.instructions ?? ""}`.trim(),
      "prescription",
      prescriptionId,
    )
  }

  return review
}

export async function getPrescription(prescriptionId: string) {
  const [rx] = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.id, prescriptionId))
    .limit(1)

  return rx ?? null
}

export async function listVerifiedPrescriptionPharmacies() {
  const rows = await db
    .select({
      id: pharmacies.id,
      name: pharmacies.name,
      branchName: pharmacies.branchName,
      neighborhood: pharmacies.neighborhood,
      supportsDelivery: pharmacies.supportsDelivery,
    })
    .from(pharmacies)
    .where(eq(pharmacies.isVerified, true))
    .orderBy(pharmacies.name)

  return rows.map((row) => ({
    id: row.id,
    name: row.branchName ? `${row.name} - ${row.branchName}` : row.name,
    neighborhood: row.neighborhood,
    supportsDelivery: row.supportsDelivery,
  }))
}
