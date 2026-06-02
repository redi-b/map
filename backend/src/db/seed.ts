import "dotenv/config"
import { and, eq, isNull } from "drizzle-orm"
import { db, pool } from "./client.js"
import { ethiopiaEmlMedicineRows } from "./ethiopia-eml-2024.js"
import { inventoryItems, medicines, pharmacies, pharmacyStaff, profiles, user } from "./schema.js"
import { auth } from "../lib/auth.js"

// ─── Admin seed user ─────────────────────────────────────────────────────────
// This guarantees at least one admin exists in the system.
// In production, the first admin should be created via a secure bootstrap script.
const ADMIN_EMAIL = "admin@map.local"
const ADMIN_PASSWORD = "mapAdmin2026!"
const ADMIN_NAME = "MAP Administrator"

const PHARMACIST_PASSWORD = "mapPharmacy2026!"

// ─── Pharmacy seed data ──────────────────────────────────────────────────────
const pharmacyRows = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Milo Pharmacy",
    branchName: "Summit",
    licenseNumber: "AA-PH-1001",
    address: "Summit, beside Oromia Bank, 30 Meter, Fiyel Bet, Addis Ababa",
    neighborhood: "Summit",
    phone: "+251928222228",
    email: "summit@milo.example",
    latitude: "9.0099716",
    longitude: "38.8575788",
    supportsDelivery: true,
    isVerified: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Red Cross Pharmacy",
    branchName: "Benin Street",
    licenseNumber: "AA-PH-1002",
    address: "Benin Street, Addis Ababa",
    neighborhood: "Arada",
    phone: "+251115159074",
    email: "benin@redcross.example",
    latitude: "9.0394161",
    longitude: "38.7531969",
    supportsDelivery: false,
    isVerified: true,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Bole Pharmacy",
    branchName: "Africa Avenue",
    licenseNumber: "AA-PH-1003",
    address: "Africa Avenue, Addis Ababa",
    neighborhood: "Bole",
    phone: "+251911747949",
    email: "africa-avenue@bole.example",
    latitude: "9.0052290",
    longitude: "38.7679372",
    supportsDelivery: true,
    isVerified: true,
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    name: "GOH Pharmacy",
    branchName: "Djibuti Street",
    licenseNumber: "AA-PH-1004",
    address: "Djibuti Street, Addis Ababa",
    neighborhood: "Bole",
    phone: "+251116631472",
    email: "djibuti@goh.example",
    latitude: "9.0071047",
    longitude: "38.7889929",
    supportsDelivery: true,
    isVerified: true,
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    name: "Gishen Pharmacy",
    branchName: "Piassa",
    licenseNumber: "AA-PH-1005",
    address: "Piassa, near St. George Cathedral, Addis Ababa",
    neighborhood: "Piassa",
    phone: "+251116611717",
    email: "piassa@gishen.example",
    latitude: "9.0365600",
    longitude: "38.7521400",
    supportsDelivery: false,
    isVerified: true,
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    name: "Kebron Pharmacy",
    branchName: "Shola",
    licenseNumber: "AA-PH-1006",
    address: "Kenenisa Avenue, around Shola Market, Addis Ababa",
    neighborhood: "Shola",
    phone: "+251935401496",
    email: "shola@kebron.example",
    latitude: "9.0211342",
    longitude: "38.7929070",
    supportsDelivery: true,
    isVerified: true,
  },
  {
    id: "77777777-7777-4777-8777-777777777777",
    name: "Zamalik Pharmacy",
    branchName: "Tor Hailoch",
    licenseNumber: "AA-PH-1007",
    address: "Tor Hailoch, Addis Ababa",
    neighborhood: "Tor Hailoch",
    phone: "+251928666647",
    email: "torhailoch@zamalik.example",
    latitude: "9.0118500",
    longitude: "38.7202900",
    supportsDelivery: false,
    isVerified: true,
  },
  {
    id: "88888888-8888-4888-8888-888888888888",
    name: "Lelem Pharmacy",
    branchName: "Summit Condominium",
    licenseNumber: "AA-PH-1008",
    address: "Summit Condominium Block 183, Addis Ababa",
    neighborhood: "Summit",
    phone: "+251910000808",
    email: "summit@lelem.example",
    latitude: "8.9897546",
    longitude: "38.8571289",
    supportsDelivery: true,
    isVerified: true,
  },
  {
    id: "99999999-9999-4999-8999-999999999999",
    name: "Galenic Pharmacy",
    branchName: "Djibuti Street",
    licenseNumber: "AA-PH-1009",
    address: "Djibuti Street, Addis Ababa",
    neighborhood: "Bole",
    phone: "+251910000909",
    email: "djibuti@galenic.example",
    latitude: "9.0064994",
    longitude: "38.7892712",
    supportsDelivery: true,
    isVerified: true,
  },
  {
    id: "aaaaaaaa-1111-4aaa-8aaa-111111111111",
    name: "Twins Pharmacy",
    branchName: "Yeka",
    licenseNumber: "AA-PH-1010",
    address: "Yeka, Addis Ababa",
    neighborhood: "Yeka",
    phone: "+251910001010",
    email: "yeka@twins.example",
    latitude: "9.0194312",
    longitude: "38.7865371",
    supportsDelivery: false,
    isVerified: true,
  },
]

const pharmacistRows = [
  {
    email: "milo.pharmacist@map.local",
    name: "Milo Branch Pharmacist",
    phone: "+251900000101",
    pharmacyId: pharmacyRows[0].id,
  },
  {
    email: "redcross.pharmacist@map.local",
    name: "Red Cross Branch Pharmacist",
    phone: "+251900000202",
    pharmacyId: pharmacyRows[1].id,
  },
  {
    email: "bole.pharmacist@map.local",
    name: "Bole Branch Pharmacist",
    phone: "+251900000303",
    pharmacyId: pharmacyRows[2].id,
  },
  {
    email: "goh.pharmacist@map.local",
    name: "GOH Branch Pharmacist",
    phone: "+251900000404",
    pharmacyId: pharmacyRows[3].id,
  },
  {
    email: "gishen.pharmacist@map.local",
    name: "Gishen Branch Pharmacist",
    phone: "+251900000505",
    pharmacyId: pharmacyRows[4].id,
  },
]

const medicineRows = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Amoxicillin",
    form: "Capsule",
    strength: "500mg",
    category: "Antibiotic",
    manufacturer: "EPHARM",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    name: "Metformin",
    form: "Tablet",
    strength: "850mg",
    category: "Antidiabetic",
    manufacturer: "Cadila",
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    name: "Salbutamol",
    form: "Inhaler",
    strength: "100mcg",
    category: "Respiratory",
    manufacturer: "GSK",
  },
  {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    name: "Losartan",
    form: "Tablet",
    strength: "50mg",
    category: "Antihypertensive",
    manufacturer: "Sun Pharma",
  },
  {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    name: "Paracetamol",
    form: "Tablet",
    strength: "500mg",
    category: "Analgesic",
    manufacturer: "EPHARM",
  },
  {
    id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    name: "Omeprazole",
    form: "Capsule",
    strength: "20mg",
    category: "Gastrointestinal",
    manufacturer: "Cadila",
  },
  {
    id: "11111111-aaaa-4bbb-8ccc-dddddddddddd",
    name: "Atorvastatin",
    form: "Tablet",
    strength: "20mg",
    category: "Cardiovascular",
    manufacturer: "Pfizer",
  },
  {
    id: "22222222-aaaa-4bbb-8ccc-dddddddddddd",
    name: "Ciprofloxacin",
    form: "Tablet",
    strength: "500mg",
    category: "Antibiotic",
    manufacturer: "Bayer",
  },
  {
    id: "33333333-aaaa-4bbb-8ccc-dddddddddddd",
    name: "Amlodipine",
    form: "Tablet",
    strength: "5mg",
    category: "Cardiovascular",
    manufacturer: "EPHARM",
  },
  {
    id: "44444444-aaaa-4bbb-8ccc-dddddddddddd",
    name: "Ceftriaxone",
    form: "Vial",
    strength: "1g",
    category: "Antibiotic",
    manufacturer: "Cadila",
  },
  {
    id: "55555555-aaaa-4bbb-8ccc-dddddddddddd",
    name: "Insulin soluble",
    form: "Injection",
    strength: "100IU/ml",
    category: "Antidiabetic",
    manufacturer: "Novo Nordisk",
  },
  {
    id: "66666666-aaaa-4bbb-8ccc-dddddddddddd",
    name: "Oral rehydration salts",
    form: "Powder",
    strength: "20.5g sachet",
    category: "Gastrointestinal",
    manufacturer: "EPHARM",
  },
  {
    id: "77777777-aaaa-4bbb-8ccc-dddddddddddd",
    name: "Azithromycin",
    form: "Tablet",
    strength: "500mg",
    category: "Antibiotic",
    manufacturer: "Sun Pharma",
  },
  {
    id: "88888888-aaaa-4bbb-8ccc-dddddddddddd",
    name: "Ibuprofen",
    form: "Tablet",
    strength: "400mg",
    category: "Analgesic",
    manufacturer: "EPHARM",
  },
  {
    id: "99999999-aaaa-4bbb-8ccc-dddddddddddd",
    name: "Cetirizine",
    form: "Tablet",
    strength: "10mg",
    category: "Antihistamine",
    manufacturer: "Cadila",
  },
]

function medicineKey(row: { name: string; form: string; strength: string | null }) {
  return [row.name, row.form, row.strength ?? ""].map((value) => value.trim().toLowerCase()).join("|")
}

const baseMedicineKeys = new Set(medicineRows.map(medicineKey))
const catalogMedicineRows = [
  ...medicineRows,
  ...ethiopiaEmlMedicineRows.filter((medicine) => !baseMedicineKeys.has(medicineKey(medicine))),
]

function stockStatusForQuantity(quantity: number) {
  if (quantity === 0) return "out_of_stock" as const
  if (quantity < 10) return "low_stock" as const
  return "in_stock" as const
}

function inventoryRow(index: number, pharmacyIndex: number, medicineIndex: number, quantity: number, unitPriceEtb: string, expiresAt: string | null) {
  return {
    id: `90000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    pharmacyId: pharmacyRows[pharmacyIndex].id,
    medicineId: medicineRows[medicineIndex].id,
    quantity,
    unitPriceEtb,
    stockStatus: stockStatusForQuantity(quantity),
    expiresAt: expiresAt ? new Date(`${expiresAt}T00:00:00.000Z`) : null,
  }
}

const inventoryRows = [
  inventoryRow(1, 0, 0, 84, "165.00", "2027-10-01"),
  inventoryRow(2, 0, 1, 120, "75.00", "2027-09-01"),
  inventoryRow(3, 0, 2, 36, "430.00", "2027-11-01"),
  inventoryRow(4, 0, 3, 64, "115.00", "2028-01-01"),
  inventoryRow(5, 0, 4, 340, "10.00", "2028-04-01"),
  inventoryRow(6, 0, 5, 90, "195.00", "2027-08-01"),
  inventoryRow(7, 0, 6, 48, "295.00", "2028-02-01"),
  inventoryRow(8, 0, 7, 28, "135.00", "2027-07-01"),
  inventoryRow(9, 0, 8, 80, "65.00", "2028-03-01"),
  inventoryRow(10, 0, 9, 22, "260.00", "2027-12-01"),
  inventoryRow(11, 0, 10, 12, "540.00", "2027-06-01"),
  inventoryRow(12, 0, 11, 160, "8.00", "2028-05-01"),
  inventoryRow(13, 0, 12, 18, "220.00", "2027-09-15"),
  inventoryRow(14, 0, 13, 70, "45.00", "2028-03-15"),
  inventoryRow(15, 0, 14, 72, "25.00", "2028-02-15"),
  inventoryRow(16, 1, 0, 60, "170.00", "2027-08-15"),
  inventoryRow(17, 1, 2, 18, "455.00", "2027-09-01"),
  inventoryRow(18, 1, 4, 250, "12.00", "2028-01-01"),
  inventoryRow(19, 1, 9, 15, "250.00", "2027-10-01"),
  inventoryRow(20, 1, 10, 6, "525.00", "2027-05-01"),
  inventoryRow(21, 1, 11, 140, "7.50", "2028-06-01"),
  inventoryRow(22, 2, 0, 24, "180.00", "2027-07-01"),
  inventoryRow(23, 2, 1, 70, "82.50", "2027-03-01"),
  inventoryRow(24, 2, 3, 8, "120.00", "2026-12-01"),
  inventoryRow(25, 2, 5, 50, "210.00", "2027-06-01"),
  inventoryRow(26, 2, 14, 0, "28.00", null),
  inventoryRow(27, 3, 2, 20, "445.00", "2027-11-01"),
  inventoryRow(28, 3, 4, 180, "11.00", "2028-01-15"),
  inventoryRow(29, 3, 8, 34, "70.00", "2028-03-01"),
  inventoryRow(30, 3, 12, 12, "230.00", "2027-08-01"),
  inventoryRow(31, 4, 0, 0, "175.00", null),
  inventoryRow(32, 4, 5, 30, "205.00", "2027-06-01"),
  inventoryRow(33, 4, 6, 12, "320.00", "2027-02-01"),
  inventoryRow(34, 4, 7, 9, "145.00", "2027-04-01"),
  inventoryRow(35, 4, 4, 90, "14.00", "2028-02-01"),
  inventoryRow(36, 5, 1, 44, "78.00", "2027-10-01"),
  inventoryRow(37, 5, 3, 20, "118.00", "2027-12-01"),
  inventoryRow(38, 5, 8, 30, "68.00", "2028-01-01"),
  inventoryRow(39, 5, 11, 80, "8.50", "2028-06-01"),
  inventoryRow(40, 5, 13, 60, "42.00", "2028-03-01"),
  inventoryRow(41, 6, 0, 14, "185.00", "2027-07-15"),
  inventoryRow(42, 6, 4, 70, "13.00", "2028-01-01"),
  inventoryRow(43, 6, 5, 9, "215.00", "2027-06-15"),
  inventoryRow(44, 6, 14, 24, "26.00", "2028-02-01"),
  inventoryRow(45, 7, 1, 35, "80.00", "2027-09-01"),
  inventoryRow(46, 7, 2, 8, "465.00", "2027-10-01"),
  inventoryRow(47, 7, 10, 4, "550.00", "2027-04-01"),
  inventoryRow(48, 7, 11, 110, "8.00", "2028-05-01"),
  inventoryRow(49, 8, 4, 100, "12.50", "2028-01-01"),
  inventoryRow(50, 8, 12, 7, "225.00", "2027-08-01"),
  inventoryRow(51, 8, 13, 40, "44.00", "2028-03-01"),
  inventoryRow(52, 9, 0, 20, "178.00", "2027-09-01"),
  inventoryRow(53, 9, 3, 10, "122.00", "2027-12-15"),
  inventoryRow(54, 9, 8, 12, "72.00", "2028-03-01"),
  inventoryRow(55, 9, 9, 0, "255.00", null),
]

async function seedAdmin() {
  // Use Better Auth's API to create the admin user so password hashing is handled
  try {
    await auth.api.signUpEmail({
      body: {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      },
    })
    console.log(`  Created auth user: ${ADMIN_EMAIL}`)
  } catch {
    // User likely already exists; that is fine.
    console.log(`  Auth user already exists: ${ADMIN_EMAIL}`)
  }

  const [authUser] = await db
    .select()
    .from(user)
    .where(eq(user.email, ADMIN_EMAIL))
    .limit(1)

  if (!authUser) {
    console.error("  ⚠ Could not find admin auth user after creation")
    return
  }

  // Upsert admin profile
  await db
    .insert(profiles)
    .values({
      authUserId: authUser.id,
      fullName: ADMIN_NAME,
      phone: "+251900000000",
      role: "admin",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: profiles.authUserId,
      set: {
        fullName: ADMIN_NAME,
        role: "admin",
        isActive: true,
      },
    })

  console.log(`  Admin profile set for: ${ADMIN_EMAIL}`)
}

async function upsertPharmacist(row: (typeof pharmacistRows)[number]) {
  try {
    await auth.api.signUpEmail({
      body: {
        name: row.name,
        email: row.email,
        password: PHARMACIST_PASSWORD,
      },
    })
    console.log(`  Created auth user: ${row.email}`)
  } catch {
    console.log(`  Auth user already exists: ${row.email}`)
  }

  const [authUser] = await db
    .select()
    .from(user)
    .where(eq(user.email, row.email))
    .limit(1)

  if (!authUser) {
    console.error(`  Could not find pharmacist auth user: ${row.email}`)
    return null
  }

  const [profile] = await db
    .insert(profiles)
    .values({
      authUserId: authUser.id,
      fullName: row.name,
      phone: row.phone,
      role: "pharmacist",
      isActive: true,
      mustChangePassword: true,
    })
    .onConflictDoUpdate({
      target: profiles.authUserId,
      set: {
        fullName: row.name,
        phone: row.phone,
        role: "pharmacist",
        isActive: true,
      },
    })
    .returning()

  return profile
}

async function seedPharmacyStaff() {
  for (const pharmacist of pharmacistRows) {
    const profile = await upsertPharmacist(pharmacist)
    if (!profile) continue

    const [existingStaff] = await db
      .select({ id: pharmacyStaff.id, pharmacyId: pharmacyStaff.pharmacyId })
      .from(pharmacyStaff)
      .where(eq(pharmacyStaff.profileId, profile.id))
      .limit(1)

    if (existingStaff) {
      if (existingStaff.pharmacyId !== pharmacist.pharmacyId) {
        await db
          .update(pharmacyStaff)
          .set({ pharmacyId: pharmacist.pharmacyId, roleInPharmacy: "pharmacist" })
          .where(eq(pharmacyStaff.id, existingStaff.id))
      }
    } else {
      await db.insert(pharmacyStaff).values({
        pharmacyId: pharmacist.pharmacyId,
        profileId: profile.id,
        roleInPharmacy: "pharmacist",
      })
    }

    const pharmacy = pharmacyRows.find((item) => item.id === pharmacist.pharmacyId)
    if (!pharmacy) continue

    await db
      .update(pharmacies)
      .set({ ownerProfileId: profile.id })
      .where(and(eq(pharmacies.id, pharmacist.pharmacyId), isNull(pharmacies.ownerProfileId)))

    console.log(`  Linked ${profile.fullName} to ${pharmacy.name}`)
  }
}

async function seed() {
  console.log("Seeding MAP development data...")

  // Seed admin user
  console.log("\n1. Admin user")
  await seedAdmin()

  // Seed pharmacies
  console.log("\n2. Pharmacies")
  for (const pharmacy of pharmacyRows) {
    await db
      .insert(pharmacies)
      .values(pharmacy)
      .onConflictDoUpdate({
        target: pharmacies.id,
        set: {
          name: pharmacy.name,
          branchName: pharmacy.branchName,
          licenseNumber: pharmacy.licenseNumber,
          address: pharmacy.address,
          neighborhood: pharmacy.neighborhood,
          phone: pharmacy.phone,
          email: pharmacy.email,
          latitude: pharmacy.latitude,
          longitude: pharmacy.longitude,
          supportsDelivery: pharmacy.supportsDelivery,
          isVerified: pharmacy.isVerified,
        },
      })
  }
  console.log(`  ${pharmacyRows.length} pharmacies upserted`)

  // Link seeded pharmacist profiles to their pharmacy.
  console.log("\n3. Pharmacy staff")
  await seedPharmacyStaff()

  // Seed medicines
  console.log("\n4. Medicines")
  for (const medicine of catalogMedicineRows) {
    await db
      .insert(medicines)
      .values(medicine)
      .onConflictDoUpdate({
        target: medicines.id,
        set: {
          name: medicine.name,
          form: medicine.form,
          strength: medicine.strength,
          category: medicine.category,
          manufacturer: medicine.manufacturer,
        },
      })
  }
  console.log(`  ${catalogMedicineRows.length} medicines upserted`)

  // Seed inventory
  console.log("\n5. Inventory")
  for (const inventoryItem of inventoryRows) {
    await db
      .insert(inventoryItems)
      .values(inventoryItem)
      .onConflictDoUpdate({
        target: inventoryItems.id,
        set: {
          pharmacyId: inventoryItem.pharmacyId,
          medicineId: inventoryItem.medicineId,
          quantity: inventoryItem.quantity,
          unitPriceEtb: inventoryItem.unitPriceEtb,
          stockStatus: inventoryItem.stockStatus,
          expiresAt: inventoryItem.expiresAt,
          updatedAt: new Date(),
        },
      })
  }
  console.log(`  ${inventoryRows.length} inventory items upserted`)

  console.log("\n✓ Seed complete.\n")
  console.log("Admin login:")
  console.log(`  Email:    ${ADMIN_EMAIL}`)
  console.log(`  Password: ${ADMIN_PASSWORD}`)
  console.log("\nPharmacist logins:")
  for (const pharmacist of pharmacistRows) {
    const pharmacy = pharmacyRows.find((item) => item.id === pharmacist.pharmacyId)
    console.log(`  ${pharmacy?.name ?? "Pharmacy"}: ${pharmacist.email} / ${PHARMACIST_PASSWORD}`)
  }
}

seed()
  .then(async () => {
    await pool.end()
  })
  .catch(async (error) => {
    console.error(error)
    await pool.end()
    process.exit(1)
  })
