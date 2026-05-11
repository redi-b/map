import { and, desc, eq } from "drizzle-orm"
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

export async function createPrescription(
  patientProfileId: string,
  input: CreatePrescriptionInput,
  imageUrl?: string,
) {
  const [rx] = await db
    .insert(prescriptions)
    .values({
      patientProfileId,
      pharmacyId: input.pharmacyId,
      status: "uploaded",
      imageUrl: imageUrl ?? null,
      notes: input.notes ?? null,
    })
    .returning()

  // Notify pharmacy staff
  await createNotification(
    patientProfileId,
    `Prescription submitted to pharmacy. We'll notify you when it's reviewed.`,
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

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    imageUrl: r.imageUrl,
    notes: r.notes,
    pharmacy: r.pharmacyName,
    neighborhood: r.pharmacyNeighborhood,
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
    imageUrl: r.imageUrl,
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
    .select({ patientProfileId: prescriptions.patientProfileId })
    .from(prescriptions)
    .where(eq(prescriptions.id, prescriptionId))
    .limit(1)

  if (rx) {
    const actionLabel = input.action === "approve" ? "approved" : input.action === "reject" ? "rejected" : "updated"
    await createNotification(
      rx.patientProfileId,
      `Your prescription has been ${actionLabel}. ${input.instructions ?? ""}`.trim(),
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
