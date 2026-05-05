import "dotenv/config"
import { db, pool } from "./client.js"
import { inventoryItems, medicines, pharmacies } from "./schema.js"

const pharmacyRows = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Lion Pharmacy",
    branchName: "Bole Medhanialem",
    licenseNumber: "AA-PH-1001",
    address: "Bole Medhanialem, Addis Ababa",
    neighborhood: "Bole",
    phone: "+251911000101",
    email: "bole@lion.example",
    latitude: "8.9965000",
    longitude: "38.7898000",
    isVerified: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Wudassie Pharmacy",
    branchName: "Kazanchis",
    licenseNumber: "AA-PH-1002",
    address: "Kazanchis, Addis Ababa",
    neighborhood: "Kazanchis",
    phone: "+251911000202",
    email: "kazanchis@wudassie.example",
    latitude: "9.0183000",
    longitude: "38.7636000",
    isVerified: true,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "HealthPlus Pharmacy",
    branchName: "Piazza",
    licenseNumber: "AA-PH-1003",
    address: "Piazza, Addis Ababa",
    neighborhood: "Piazza",
    phone: "+251911000303",
    email: "piazza@healthplus.example",
    latitude: "9.0357000",
    longitude: "38.7513000",
    isVerified: false,
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
]

const inventoryRows = [
  {
    id: "90000000-0000-4000-8000-000000000001",
    pharmacyId: pharmacyRows[0].id,
    medicineId: medicineRows[0].id,
    quantity: 42,
    unitPriceEtb: "185.00",
    stockStatus: "in_stock" as const,
    expiresAt: new Date("2027-07-01T00:00:00.000Z"),
  },
  {
    id: "90000000-0000-4000-8000-000000000002",
    pharmacyId: pharmacyRows[1].id,
    medicineId: medicineRows[1].id,
    quantity: 9,
    unitPriceEtb: "82.50",
    stockStatus: "low_stock" as const,
    expiresAt: new Date("2027-03-01T00:00:00.000Z"),
  },
  {
    id: "90000000-0000-4000-8000-000000000003",
    pharmacyId: pharmacyRows[2].id,
    medicineId: medicineRows[2].id,
    quantity: 0,
    unitPriceEtb: "455.00",
    stockStatus: "out_of_stock" as const,
    expiresAt: null,
  },
  {
    id: "90000000-0000-4000-8000-000000000004",
    pharmacyId: pharmacyRows[0].id,
    medicineId: medicineRows[3].id,
    quantity: 18,
    unitPriceEtb: "120.00",
    stockStatus: "in_stock" as const,
    expiresAt: new Date("2026-12-01T00:00:00.000Z"),
  },
]

async function seed() {
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
          isVerified: pharmacy.isVerified,
        },
      })
  }

  for (const medicine of medicineRows) {
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
}

seed()
  .then(async () => {
    console.log("Seeded MAP development data.")
    await pool.end()
  })
  .catch(async (error) => {
    console.error(error)
    await pool.end()
    process.exit(1)
  })
