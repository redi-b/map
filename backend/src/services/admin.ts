import { desc, eq } from "drizzle-orm"
import { db } from "../db/client.js"
import { pharmacies } from "../db/schema.js"
import type { CreateAdminPharmacyInput, VerifyAdminPharmacyInput } from "../validators/admin.js"

export async function listAdminPharmacies() {
  const rows = await db.select().from(pharmacies).orderBy(desc(pharmacies.createdAt))

  return rows.map((pharmacy) => ({
    id: pharmacy.id,
    name: pharmacy.name,
    branchName: pharmacy.branchName,
    licenseNumber: pharmacy.licenseNumber,
    address: pharmacy.address,
    neighborhood: pharmacy.neighborhood,
    phone: pharmacy.phone,
    email: pharmacy.email,
    supportsDelivery: pharmacy.supportsDelivery,
    operatingHours: pharmacy.operatingHours,
    isVerified: pharmacy.isVerified,
    createdAt: pharmacy.createdAt.toISOString(),
  }))
}

export async function createAdminPharmacy(input: CreateAdminPharmacyInput) {
  const [pharmacy] = await db
    .insert(pharmacies)
    .values({
      name: input.name,
      branchName: input.branchName || null,
      licenseNumber: input.licenseNumber,
      address: input.address,
      neighborhood: input.neighborhood,
      phone: input.phone,
      email: input.email || null,
      supportsDelivery: input.supportsDelivery,
      operatingHours: input.operatingHours || null,
      isVerified: input.isVerified,
    })
    .returning()

  return {
    id: pharmacy.id,
    name: pharmacy.name,
    branchName: pharmacy.branchName,
    licenseNumber: pharmacy.licenseNumber,
    address: pharmacy.address,
    neighborhood: pharmacy.neighborhood,
    phone: pharmacy.phone,
    email: pharmacy.email,
    supportsDelivery: pharmacy.supportsDelivery,
    operatingHours: pharmacy.operatingHours,
    isVerified: pharmacy.isVerified,
    createdAt: pharmacy.createdAt.toISOString(),
  }
}

export async function verifyAdminPharmacy(id: string, input: VerifyAdminPharmacyInput) {
  const [pharmacy] = await db
    .update(pharmacies)
    .set({ isVerified: input.isVerified })
    .where(eq(pharmacies.id, id))
    .returning()

  if (!pharmacy) return null

  return {
    id: pharmacy.id,
    name: pharmacy.name,
    branchName: pharmacy.branchName,
    licenseNumber: pharmacy.licenseNumber,
    address: pharmacy.address,
    neighborhood: pharmacy.neighborhood,
    phone: pharmacy.phone,
    email: pharmacy.email,
    supportsDelivery: pharmacy.supportsDelivery,
    operatingHours: pharmacy.operatingHours,
    isVerified: pharmacy.isVerified,
    createdAt: pharmacy.createdAt.toISOString(),
  }
}
