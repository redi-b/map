import { and, desc, eq, ilike, ne } from "drizzle-orm"
import { db } from "../db/client.js"
import { inventoryItems, medicines, pharmacies, pharmacyStaff } from "../db/schema.js"
import type { AddInventoryItemInput, UpdateInventoryItemInput } from "../validators/inventory.js"

/** Find which pharmacy a staff member belongs to. */
export async function getPharmacyForStaff(profileId: string) {
  // Check pharmacy_staff table first
  const [staffRow] = await db
    .select({ pharmacyId: pharmacyStaff.pharmacyId })
    .from(pharmacyStaff)
    .where(eq(pharmacyStaff.profileId, profileId))
    .limit(1)

  if (staffRow) return staffRow.pharmacyId

  // Fallback: check if profile owns a pharmacy
  const [ownerRow] = await db
    .select({ id: pharmacies.id })
    .from(pharmacies)
    .where(eq(pharmacies.ownerProfileId, profileId))
    .limit(1)

  return ownerRow?.id ?? null
}

export async function listInventory(pharmacyId: string, filters?: { search?: string; stockFilter?: string }) {
  const conditions = [eq(inventoryItems.pharmacyId, pharmacyId)]

  if (filters?.stockFilter && filters.stockFilter !== "all") {
    if (filters.stockFilter === "low_stock") {
      conditions.push(eq(inventoryItems.stockStatus, "low_stock"))
    } else if (filters.stockFilter === "out_of_stock") {
      conditions.push(eq(inventoryItems.stockStatus, "out_of_stock"))
    } else if (filters.stockFilter === "in_stock") {
      conditions.push(ne(inventoryItems.stockStatus, "out_of_stock"))
    }
  }

  const rows = await db
    .select({
      id: inventoryItems.id,
      quantity: inventoryItems.quantity,
      unitPriceEtb: inventoryItems.unitPriceEtb,
      stockStatus: inventoryItems.stockStatus,
      expiresAt: inventoryItems.expiresAt,
      updatedAt: inventoryItems.updatedAt,
      medicineName: medicines.name,
      medicineForm: medicines.form,
      medicineStrength: medicines.strength,
      medicineCategory: medicines.category,
      medicineId: medicines.id,
    })
    .from(inventoryItems)
    .innerJoin(medicines, eq(inventoryItems.medicineId, medicines.id))
    .where(and(...conditions))
    .orderBy(desc(inventoryItems.updatedAt))

  // Client-side search filter (medicine name)
  const filtered = filters?.search
    ? rows.filter((r) => r.medicineName.toLowerCase().includes(filters.search!.toLowerCase()))
    : rows

  return filtered.map((row) => ({
    id: row.id,
    medicine: {
      id: row.medicineId,
      name: row.medicineName,
      form: row.medicineForm,
      strength: row.medicineStrength,
      category: row.medicineCategory,
    },
    quantity: row.quantity,
    unitPriceEtb: Number(row.unitPriceEtb),
    stockStatus: row.stockStatus,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  }))
}

export async function addInventoryItem(pharmacyId: string, input: AddInventoryItemInput) {
  const status = input.stockStatus ?? (input.quantity === 0 ? "out_of_stock" : input.quantity < 10 ? "low_stock" : "in_stock")

  const [item] = await db
    .insert(inventoryItems)
    .values({
      pharmacyId,
      medicineId: input.medicineId,
      quantity: input.quantity,
      unitPriceEtb: String(input.unitPriceEtb),
      stockStatus: status,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    })
    .returning()

  return item
}

export async function updateInventoryItem(itemId: string, pharmacyId: string, input: UpdateInventoryItemInput) {
  // Verify ownership
  const [existing] = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.pharmacyId, pharmacyId)))
    .limit(1)

  if (!existing) return null

  const newQuantity = input.quantity ?? existing.quantity
  const autoStatus = newQuantity === 0 ? "out_of_stock" : newQuantity < 10 ? "low_stock" : "in_stock"

  const [updated] = await db
    .update(inventoryItems)
    .set({
      quantity: input.quantity ?? existing.quantity,
      unitPriceEtb: input.unitPriceEtb ? String(input.unitPriceEtb) : existing.unitPriceEtb,
      stockStatus: input.stockStatus ?? autoStatus,
      expiresAt: input.expiresAt !== undefined ? (input.expiresAt ? new Date(input.expiresAt) : null) : existing.expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(inventoryItems.id, itemId))
    .returning()

  return updated
}

export async function deleteInventoryItem(itemId: string, pharmacyId: string) {
  const [existing] = await db
    .select({ id: inventoryItems.id })
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.pharmacyId, pharmacyId)))
    .limit(1)

  if (!existing) return false

  await db.delete(inventoryItems).where(eq(inventoryItems.id, itemId))
  return true
}

/** List all medicines for the add-to-inventory dropdown. */
export async function listMedicines() {
  return db
    .select({
      id: medicines.id,
      name: medicines.name,
      form: medicines.form,
      strength: medicines.strength,
      category: medicines.category,
    })
    .from(medicines)
    .orderBy(medicines.name)
}
