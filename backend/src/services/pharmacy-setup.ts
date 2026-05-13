import { eq } from "drizzle-orm"
import { db } from "../db/client.js"
import { pharmacies, pharmacyStaff, profiles } from "../db/schema.js"

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

  return {
    assignedPharmacy: staffRow ? serializePharmacy(staffRow.pharmacy) : null,
  }
}

export async function markPasswordSetupComplete(profileId: string) {
  await db
    .update(profiles)
    .set({ mustChangePassword: false })
    .where(eq(profiles.id, profileId))

  return getPharmacySetupState(profileId)
}
