import { randomBytes } from "node:crypto"
import { desc, eq } from "drizzle-orm"
import { db } from "../db/client.js"
import { pharmacies, pharmacyStaff, profiles, user as authUsers } from "../db/schema.js"
import { auth } from "../lib/auth.js"
import type {
  CreateAdminPharmacyInput,
  CreateAdminUserInput,
  UpdateAdminUserInput,
  VerifyAdminPharmacyInput,
} from "../validators/admin.js"

function generateTemporaryPassword() {
  return `MAP-${randomBytes(9).toString("base64url")}`
}

function serializePharmacy(pharmacy: typeof pharmacies.$inferSelect) {
  return {
    id: pharmacy.id,
    name: pharmacy.name,
    branchName: pharmacy.branchName,
    licenseNumber: pharmacy.licenseNumber,
    address: pharmacy.address,
    neighborhood: pharmacy.neighborhood,
    phone: pharmacy.phone,
    email: pharmacy.email,
    latitude: pharmacy.latitude !== null ? Number(pharmacy.latitude) : null,
    longitude: pharmacy.longitude !== null ? Number(pharmacy.longitude) : null,
    supportsDelivery: pharmacy.supportsDelivery,
    operatingHours: pharmacy.operatingHours,
    isVerified: pharmacy.isVerified,
    createdAt: pharmacy.createdAt.toISOString(),
  }
}

async function ensureNewAuthUser(input: { email: string; name: string; password: string }) {
  const [existingUser] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, input.email))
    .limit(1)

  if (existingUser) {
    throw new Error("A user with this email already exists")
  }

  await auth.api.signUpEmail({
    body: {
      name: input.name,
      email: input.email,
      password: input.password,
    },
  })

  const [authUser] = await db
    .select()
    .from(authUsers)
    .where(eq(authUsers.email, input.email))
    .limit(1)

  if (!authUser) {
    throw new Error("Unable to create user")
  }

  return authUser
}

async function assignUserToPharmacy(profileId: string, pharmacyId?: string | null) {
  if (!pharmacyId) {
    await db.delete(pharmacyStaff).where(eq(pharmacyStaff.profileId, profileId))
    return
  }

  const [existingStaff] = await db
    .select({ id: pharmacyStaff.id })
    .from(pharmacyStaff)
    .where(eq(pharmacyStaff.profileId, profileId))
    .limit(1)

  if (existingStaff) {
    await db
      .update(pharmacyStaff)
      .set({ pharmacyId, roleInPharmacy: "pharmacist" })
      .where(eq(pharmacyStaff.id, existingStaff.id))
  } else {
    await db.insert(pharmacyStaff).values({
      pharmacyId,
      profileId,
      roleInPharmacy: "pharmacist",
    })
  }
}

export async function listAdminPharmacies() {
  const rows = await db.select().from(pharmacies).orderBy(desc(pharmacies.createdAt))

  return rows.map(serializePharmacy)
}

export async function createAdminPharmacy(input: CreateAdminPharmacyInput) {
  const initialPassword = generateTemporaryPassword()
  const authUser = await ensureNewAuthUser({
    name: input.primaryContactName,
    email: input.primaryContactEmail,
    password: initialPassword,
  })

  const [profile] = await db
    .insert(profiles)
    .values({
      authUserId: authUser.id,
      fullName: input.primaryContactName,
      phone: input.primaryContactPhone || input.phone || null,
      role: "pharmacist",
      isActive: true,
      mustChangePassword: true,
    })
    .returning()

  const [pharmacy] = await db
    .insert(pharmacies)
    .values({
      ownerProfileId: profile.id,
      name: input.name,
      branchName: input.branchName || null,
      licenseNumber: input.licenseNumber,
      address: input.address,
      neighborhood: input.neighborhood,
      phone: input.phone,
      email: input.email || null,
      latitude: input.latitude !== undefined ? String(input.latitude) : null,
      longitude: input.longitude !== undefined ? String(input.longitude) : null,
      supportsDelivery: input.supportsDelivery,
      operatingHours: input.operatingHours || null,
      isVerified: input.isVerified,
    })
    .returning()

  await assignUserToPharmacy(profile.id, pharmacy.id)

  return {
    pharmacy: serializePharmacy(pharmacy),
    primaryUser: {
      id: profile.id,
      fullName: profile.fullName,
      email: authUser.email,
      initialPassword,
    },
  }
}

export async function verifyAdminPharmacy(id: string, input: VerifyAdminPharmacyInput) {
  const [pharmacy] = await db
    .update(pharmacies)
    .set({ isVerified: input.isVerified })
    .where(eq(pharmacies.id, id))
    .returning()

  if (!pharmacy) return null

  return serializePharmacy(pharmacy)
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
      mustChangePassword: profiles.mustChangePassword,
      pharmacyId: pharmacyStaff.pharmacyId,
      pharmacyName: pharmacies.name,
      pharmacyBranchName: pharmacies.branchName,
    })
    .from(profiles)
    .innerJoin(authUsers, eq(profiles.authUserId, authUsers.id))
    .leftJoin(pharmacyStaff, eq(pharmacyStaff.profileId, profiles.id))
    .leftJoin(pharmacies, eq(pharmacyStaff.pharmacyId, pharmacies.id))
    .orderBy(desc(profiles.createdAt))

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }))
}

async function getAdminUserByProfileId(id: string) {
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
      mustChangePassword: profiles.mustChangePassword,
      pharmacyId: pharmacyStaff.pharmacyId,
      pharmacyName: pharmacies.name,
      pharmacyBranchName: pharmacies.branchName,
    })
    .from(profiles)
    .innerJoin(authUsers, eq(profiles.authUserId, authUsers.id))
    .leftJoin(pharmacyStaff, eq(pharmacyStaff.profileId, profiles.id))
    .leftJoin(pharmacies, eq(pharmacyStaff.pharmacyId, pharmacies.id))
    .where(eq(profiles.id, id))
    .limit(1)

  if (!row) return null

  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function updateAdminUser(id: string, input: UpdateAdminUserInput) {
  const [currentUser] = await db
    .select({
      role: profiles.role,
      pharmacyId: pharmacyStaff.pharmacyId,
    })
    .from(profiles)
    .leftJoin(pharmacyStaff, eq(pharmacyStaff.profileId, profiles.id))
    .where(eq(profiles.id, id))
    .limit(1)

  if (!currentUser) return null

  const nextRole = input.role ?? currentUser.role
  if (nextRole === "pharmacist" && input.pharmacyId === undefined && !currentUser.pharmacyId) {
    throw new Error("Pharmacy is required for pharmacist users")
  }

  const [profile] = await db
    .update(profiles)
    .set({
      ...(input.role ? { role: input.role } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.role && input.role !== "pharmacist" ? { mustChangePassword: false } : {}),
    })
    .where(eq(profiles.id, id))
    .returning()

  if (!profile) return null

  if (input.pharmacyId !== undefined || (input.role && input.role !== "pharmacist")) {
    await assignUserToPharmacy(profile.id, input.role && input.role !== "pharmacist" ? null : input.pharmacyId)
  }

  return getAdminUserByProfileId(profile.id)
}

export async function createAdminUser(input: CreateAdminUserInput) {
  const initialPassword = generateTemporaryPassword()
  const authUser = await ensureNewAuthUser({
    name: input.fullName,
    email: input.email,
    password: initialPassword,
  })

  const [profile] = await db
    .insert(profiles)
    .values({
      authUserId: authUser.id,
      fullName: input.fullName,
      phone: input.phone || null,
      role: input.role,
      isActive: true,
      mustChangePassword: true,
    })
    .returning()

  await assignUserToPharmacy(profile.id, input.pharmacyId)
  const user = await getAdminUserByProfileId(profile.id)

  if (!user) {
    throw new Error("Unable to load created user")
  }

  return {
    user,
    initialPassword,
  }
}
