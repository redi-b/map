import "dotenv/config"
import { and, eq, isNull } from "drizzle-orm"
import { db, pool } from "./client.js"
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
    name: "Lion Pharmacy",
    branchName: "Bole Medhanialem",
    licenseNumber: "AA-PH-1001",
    address: "Bole Medhanialem, Addis Ababa",
    neighborhood: "Bole",
    phone: "+251911000101",
    email: "bole@lion.example",
    latitude: "8.9965000",
    longitude: "38.7898000",
    supportsDelivery: true,
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
    supportsDelivery: false,
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
    supportsDelivery: true,
    isVerified: true,
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    name: "Red Cross Pharmacy",
    branchName: "Megenagna",
    licenseNumber: "AA-PH-1004",
    address: "Megenagna, Addis Ababa",
    neighborhood: "Megenagna",
    phone: "+251911000404",
    email: "megenagna@redcross.example",
    latitude: "9.0121000",
    longitude: "38.8012000",
    supportsDelivery: false,
    isVerified: true,
  },
]

const pharmacistRows = [
  {
    email: "lion.pharmacist@map.local",
    name: "Lion Branch Pharmacist",
    phone: "+251900000101",
    pharmacyId: pharmacyRows[0].id,
  },
  {
    email: "wudassie.pharmacist@map.local",
    name: "Wudassie Branch Pharmacist",
    phone: "+251900000202",
    pharmacyId: pharmacyRows[1].id,
  },
  {
    email: "healthplus.pharmacist@map.local",
    name: "HealthPlus Branch Pharmacist",
    phone: "+251900000303",
    pharmacyId: pharmacyRows[2].id,
  },
  {
    email: "redcross.pharmacist@map.local",
    name: "Red Cross Branch Pharmacist",
    phone: "+251900000404",
    pharmacyId: pharmacyRows[3].id,
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
    id: "30000000-0000-4000-8000-000000000001",
    name: "Acyclovir",
    form: "Tablet",
    strength: "400mg",
    category: "Antiviral",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    name: "Albendazole",
    form: "Tablet",
    strength: "400mg",
    category: "Antiparasitic",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    name: "Azithromycin",
    form: "Tablet",
    strength: "500mg",
    category: "Antibiotic",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000004",
    name: "Benzylpenicillin",
    form: "Injection",
    strength: "1MU",
    category: "Antibiotic",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000005",
    name: "Cefalexin",
    form: "Capsule",
    strength: "500mg",
    category: "Antibiotic",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000006",
    name: "Ceftriaxone",
    form: "Injection",
    strength: "1g",
    category: "Antibiotic",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000007",
    name: "Doxycycline",
    form: "Capsule",
    strength: "100mg",
    category: "Antibiotic",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000008",
    name: "Fluconazole",
    form: "Capsule",
    strength: "150mg",
    category: "Antifungal",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000009",
    name: "Gentamicin",
    form: "Injection",
    strength: "40mg/ml",
    category: "Antibiotic",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000010",
    name: "Metronidazole",
    form: "Tablet",
    strength: "500mg",
    category: "Antibiotic",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000011",
    name: "Nitrofurantoin",
    form: "Tablet",
    strength: "100mg",
    category: "Antibiotic",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000012",
    name: "Sulfamethoxazole + Trimethoprim",
    form: "Tablet",
    strength: "400mg + 80mg",
    category: "Antibiotic",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000013",
    name: "Amlodipine",
    form: "Tablet",
    strength: "5mg",
    category: "Cardiovascular",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000014",
    name: "Atenolol",
    form: "Tablet",
    strength: "50mg",
    category: "Cardiovascular",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000015",
    name: "Enalapril",
    form: "Tablet",
    strength: "5mg",
    category: "Cardiovascular",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000016",
    name: "Furosemide",
    form: "Tablet",
    strength: "40mg",
    category: "Cardiovascular",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000017",
    name: "Hydrochlorothiazide",
    form: "Tablet",
    strength: "25mg",
    category: "Cardiovascular",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000018",
    name: "Simvastatin",
    form: "Tablet",
    strength: "20mg",
    category: "Cardiovascular",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000019",
    name: "Spironolactone",
    form: "Tablet",
    strength: "25mg",
    category: "Cardiovascular",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000020",
    name: "Warfarin",
    form: "Tablet",
    strength: "5mg",
    category: "Anticoagulant",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000021",
    name: "Acetylsalicylic acid",
    form: "Tablet",
    strength: "100mg",
    category: "Analgesic",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000022",
    name: "Diclofenac",
    form: "Tablet",
    strength: "50mg",
    category: "Analgesic",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000023",
    name: "Ibuprofen",
    form: "Tablet",
    strength: "400mg",
    category: "Analgesic",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000024",
    name: "Morphine",
    form: "Injection",
    strength: "10mg/ml",
    category: "Analgesic",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000025",
    name: "Tramadol",
    form: "Capsule",
    strength: "50mg",
    category: "Analgesic",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000026",
    name: "Insulin regular",
    form: "Injection",
    strength: "100IU/ml",
    category: "Antidiabetic",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000027",
    name: "Insulin NPH",
    form: "Injection",
    strength: "100IU/ml",
    category: "Antidiabetic",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000028",
    name: "Glibenclamide",
    form: "Tablet",
    strength: "5mg",
    category: "Antidiabetic",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000029",
    name: "Gliclazide",
    form: "Tablet",
    strength: "80mg",
    category: "Antidiabetic",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000030",
    name: "Cetirizine",
    form: "Tablet",
    strength: "10mg",
    category: "Antihistamine",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000031",
    name: "Loratadine",
    form: "Tablet",
    strength: "10mg",
    category: "Antihistamine",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000032",
    name: "Dexamethasone",
    form: "Tablet",
    strength: "4mg",
    category: "Corticosteroid",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000033",
    name: "Hydrocortisone",
    form: "Injection",
    strength: "100mg",
    category: "Corticosteroid",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000034",
    name: "Prednisolone",
    form: "Tablet",
    strength: "5mg",
    category: "Corticosteroid",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000035",
    name: "Beclometasone",
    form: "Inhaler",
    strength: "100mcg/dose",
    category: "Respiratory",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000036",
    name: "Budesonide",
    form: "Inhaler",
    strength: "200mcg/dose",
    category: "Respiratory",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000037",
    name: "Ipratropium bromide",
    form: "Inhaler",
    strength: "20mcg/dose",
    category: "Respiratory",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000038",
    name: "Diazepam",
    form: "Tablet",
    strength: "5mg",
    category: "Neurology",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000039",
    name: "Carbamazepine",
    form: "Tablet",
    strength: "200mg",
    category: "Neurology",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000040",
    name: "Phenytoin",
    form: "Capsule",
    strength: "100mg",
    category: "Neurology",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000041",
    name: "Valproic acid",
    form: "Tablet",
    strength: "200mg",
    category: "Neurology",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000042",
    name: "Fluoxetine",
    form: "Capsule",
    strength: "20mg",
    category: "Mental health",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000043",
    name: "Haloperidol",
    form: "Tablet",
    strength: "5mg",
    category: "Mental health",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000044",
    name: "Oral rehydration salts",
    form: "Sachet",
    strength: "Low osmolarity",
    category: "Gastrointestinal",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000045",
    name: "Zinc sulfate",
    form: "Tablet",
    strength: "20mg",
    category: "Gastrointestinal",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000046",
    name: "Lactulose",
    form: "Syrup",
    strength: "3.35g/5ml",
    category: "Gastrointestinal",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000047",
    name: "Ferrous sulfate",
    form: "Tablet",
    strength: "200mg",
    category: "Nutrition",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000048",
    name: "Folic acid",
    form: "Tablet",
    strength: "5mg",
    category: "Nutrition",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000049",
    name: "Cyanocobalamin",
    form: "Injection",
    strength: "1mg/ml",
    category: "Nutrition",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000050",
    name: "Vitamin K",
    form: "Injection",
    strength: "10mg/ml",
    category: "Nutrition",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000051",
    name: "Artemether + Lumefantrine",
    form: "Tablet",
    strength: "20mg + 120mg",
    category: "Antimalarial",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000052",
    name: "Chloroquine",
    form: "Tablet",
    strength: "150mg base",
    category: "Antimalarial",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000053",
    name: "Primaquine",
    form: "Tablet",
    strength: "15mg base",
    category: "Antimalarial",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000054",
    name: "Levonorgestrel",
    form: "Tablet",
    strength: "1.5mg",
    category: "Reproductive health",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000055",
    name: "Medroxyprogesterone acetate",
    form: "Injection",
    strength: "150mg/ml",
    category: "Reproductive health",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000056",
    name: "Oxytocin",
    form: "Injection",
    strength: "10IU/ml",
    category: "Reproductive health",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000057",
    name: "Tranexamic acid",
    form: "Injection",
    strength: "100mg/ml",
    category: "Haematology",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000058",
    name: "Chlorhexidine",
    form: "Solution",
    strength: "5%",
    category: "Antiseptic",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000059",
    name: "Povidone iodine",
    form: "Solution",
    strength: "10%",
    category: "Antiseptic",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000060",
    name: "Tetracycline",
    form: "Eye ointment",
    strength: "1%",
    category: "Ophthalmology",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000061",
    name: "Timolol",
    form: "Eye drops",
    strength: "0.5%",
    category: "Ophthalmology",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000062",
    name: "Lidocaine",
    form: "Injection",
    strength: "2%",
    category: "Anaesthetic",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000063",
    name: "Adrenaline",
    form: "Injection",
    strength: "1mg/ml",
    category: "Emergency medicine",
    manufacturer: "WHO EML reference",
  },
  {
    id: "30000000-0000-4000-8000-000000000064",
    name: "Naloxone",
    form: "Injection",
    strength: "400mcg/ml",
    category: "Emergency medicine",
    manufacturer: "WHO EML reference",
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
    quantity: 25,
    unitPriceEtb: "455.00",
    stockStatus: "in_stock" as const,
    expiresAt: new Date("2027-09-01T00:00:00.000Z"),
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
  {
    id: "90000000-0000-4000-8000-000000000005",
    pharmacyId: pharmacyRows[1].id,
    medicineId: medicineRows[4].id,
    quantity: 200,
    unitPriceEtb: "12.00",
    stockStatus: "in_stock" as const,
    expiresAt: new Date("2028-01-01T00:00:00.000Z"),
  },
  {
    id: "90000000-0000-4000-8000-000000000006",
    pharmacyId: pharmacyRows[2].id,
    medicineId: medicineRows[5].id,
    quantity: 85,
    unitPriceEtb: "210.00",
    stockStatus: "in_stock" as const,
    expiresAt: new Date("2027-06-01T00:00:00.000Z"),
  },
  {
    id: "90000000-0000-4000-8000-000000000007",
    pharmacyId: pharmacyRows[3].id,
    medicineId: medicineRows[0].id,
    quantity: 60,
    unitPriceEtb: "175.00",
    stockStatus: "in_stock" as const,
    expiresAt: new Date("2027-08-15T00:00:00.000Z"),
  },
  {
    id: "90000000-0000-4000-8000-000000000008",
    pharmacyId: pharmacyRows[3].id,
    medicineId: medicineRows[6].id,
    quantity: 5,
    unitPriceEtb: "320.00",
    stockStatus: "low_stock" as const,
    expiresAt: new Date("2027-02-01T00:00:00.000Z"),
  },
  {
    id: "90000000-0000-4000-8000-000000000009",
    pharmacyId: pharmacyRows[0].id,
    medicineId: medicineRows[7].id,
    quantity: 30,
    unitPriceEtb: "145.00",
    stockStatus: "in_stock" as const,
    expiresAt: new Date("2027-04-01T00:00:00.000Z"),
  },
  {
    id: "90000000-0000-4000-8000-000000000010",
    pharmacyId: pharmacyRows[2].id,
    medicineId: medicineRows[4].id,
    quantity: 0,
    unitPriceEtb: "15.00",
    stockStatus: "out_of_stock" as const,
    expiresAt: null,
  },
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
    // User likely already exists — that's fine
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
        mustChangePassword: true,
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
  console.log(`  ${medicineRows.length} medicines upserted`)

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
