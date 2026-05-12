import { desc, eq } from "drizzle-orm"
import { db } from "../db/client.js"
import { pharmacies, profiles, user as authUsers } from "../db/schema.js"
import type {
  CreateAdminPharmacyInput,
  UpdateAdminUserInput,
  VerifyAdminPharmacyInput,
} from "../validators/admin.js"

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

export async function listAdminUsers() {
  const rows = await db
    .select({
      id: profiles.id,
      authUserId: profiles.authUserId,
      fullName: profiles.fullName,
      phone: profiles.phone,
      role: profiles.role,
      isActive: profiles.isActive,
      createdAt: profiles.createdAt,
      email: authUsers.email,
      accountName: authUsers.name,
    })
    .from(profiles)
    .innerJoin(authUsers, eq(profiles.authUserId, authUsers.id))
    .orderBy(desc(profiles.createdAt))

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }))
}

export async function updateAdminUser(id: string, input: UpdateAdminUserInput) {
  const [profile] = await db
    .update(profiles)
    .set({
      ...(input.role ? { role: input.role } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    })
    .where(eq(profiles.id, id))
    .returning()

  if (!profile) return null

  const [row] = await db
    .select({
      id: profiles.id,
      authUserId: profiles.authUserId,
      fullName: profiles.fullName,
      phone: profiles.phone,
      role: profiles.role,
      isActive: profiles.isActive,
      createdAt: profiles.createdAt,
      email: authUsers.email,
      accountName: authUsers.name,
    })
    .from(profiles)
    .innerJoin(authUsers, eq(profiles.authUserId, authUsers.id))
    .where(eq(profiles.id, profile.id))
    .limit(1)

  if (!row) return null

  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
  }
}
