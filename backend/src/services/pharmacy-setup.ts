import { asc, eq, isNull, and } from "drizzle-orm"
import { db } from "../db/client.js"
import { pharmacies, pharmacyStaff } from "../db/schema.js"
import type { AssignPharmacyInput } from "../validators/pharmacy.js"

function serializePharmacy(row: typeof pharmacies.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    branchName: row.branchName,
    licenseNumber: row.licenseNumber,
    address: row.address,
    neighborhood: row.neighborhood,
    phone: row.phone,
    email: row.email,
    supportsDelivery: row.supportsDelivery,
    operatingHours: row.operatingHours,
    isVerified: row.isVerified,
  }
}

export async function getPharmacySetupState(profileId: string) {
  const [staffRow] = await db
    .select({
      id: pharmacyStaff.id,
      pharmacy: pharmacies,
    })
    .from(pharmacyStaff)
    .innerJoin(pharmacies, eq(pharmacyStaff.pharmacyId, pharmacies.id))
    .where(eq(pharmacyStaff.profileId, profileId))
    .limit(1)

  const availableRows = await db
    .select()
    .from(pharmacies)
    .orderBy(asc(pharmacies.name), asc(pharmacies.branchName))

  return {
    assignedPharmacy: staffRow ? serializePharmacy(staffRow.pharmacy) : null,
    pharmacies: availableRows.map(serializePharmacy),
  }
}

export async function assignPharmacyToStaff(profileId: string, input: AssignPharmacyInput) {
  const [pharmacy] = await db
    .select()
    .from(pharmacies)
    .where(eq(pharmacies.id, input.pharmacyId))
    .limit(1)

  if (!pharmacy) return null

  const [existingStaff] = await db
    .select({ id: pharmacyStaff.id })
    .from(pharmacyStaff)
    .where(eq(pharmacyStaff.profileId, profileId))
    .limit(1)

  if (existingStaff) {
    await db
      .update(pharmacyStaff)
      .set({ pharmacyId: pharmacy.id, roleInPharmacy: "pharmacist" })
      .where(eq(pharmacyStaff.id, existingStaff.id))
  } else {
    await db.insert(pharmacyStaff).values({
      pharmacyId: pharmacy.id,
      profileId,
      roleInPharmacy: "pharmacist",
    })
  }

  await db
    .update(pharmacies)
    .set({ ownerProfileId: profileId })
    .where(and(eq(pharmacies.id, pharmacy.id), isNull(pharmacies.ownerProfileId)))

  return getPharmacySetupState(profileId)
}
