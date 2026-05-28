import type { FastifyPluginAsync } from "fastify"
import { requireProfile } from "../lib/auth-context.js"
import { writeAuditLog } from "../services/audit.js"
import {
  addInventoryItem,
  batchUpsertInventoryItems,
  deleteInventoryItem,
  getPharmacyForStaff,
  listInventory,
  listMedicines,
  updateInventoryItem,
} from "../services/inventory.js"
import { addInventoryItemSchema, batchInventoryItemsSchema, updateInventoryItemSchema } from "../validators/inventory.js"

export const inventoryRoutes: FastifyPluginAsync = async (app) => {
  /** GET /inventory — list inventory for the pharmacist's pharmacy. */
  app.get("/inventory", async (request, reply) => {
    const context = await requireProfile(request, reply, ["pharmacist"])
    if (!context) return

    const pharmacyId = await getPharmacyForStaff(context.profile.id)
    if (!pharmacyId) {
      return reply.status(404).send({ error: "No pharmacy assigned" })
    }

    const { search, stock } = request.query as { search?: string; stock?: string }
    const items = await listInventory(pharmacyId, { search, stockFilter: stock })

    return { pharmacyId, items }
  })

  /** POST /inventory — add an item. */
  app.post("/inventory", async (request, reply) => {
    const context = await requireProfile(request, reply, ["pharmacist"])
    if (!context) return

    const pharmacyId = await getPharmacyForStaff(context.profile.id)
    if (!pharmacyId) {
      return reply.status(404).send({ error: "No pharmacy assigned" })
    }

    const parsed = addInventoryItemSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid data", details: parsed.error.flatten().fieldErrors })
    }

    const item = await addInventoryItem(pharmacyId, parsed.data)
    await writeAuditLog({
      actorProfileId: context.profile.id,
      action: "inventory.add",
      entityType: "inventory_item",
      entityId: item.id,
      details: {
        pharmacyId,
        medicineId: item.medicineId,
        quantity: item.quantity,
        unitPriceEtb: parsed.data.unitPriceEtb,
      },
    })
    return reply.status(201).send(item)
  })

  /** POST /inventory/batch — import or update items from spreadsheet rows. */
  app.post("/inventory/batch", async (request, reply) => {
    const context = await requireProfile(request, reply, ["pharmacist"])
    if (!context) return

    const pharmacyId = await getPharmacyForStaff(context.profile.id)
    if (!pharmacyId) {
      return reply.status(404).send({ error: "No pharmacy assigned" })
    }

    const parsed = batchInventoryItemsSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid data", details: parsed.error.flatten().fieldErrors })
    }

    const result = await batchUpsertInventoryItems(pharmacyId, parsed.data.items)
    await writeAuditLog({
      actorProfileId: context.profile.id,
      action: "inventory.batch_upload",
      entityType: "pharmacy",
      entityId: pharmacyId,
      details: {
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        errorCount: result.errors?.length || 0,
      },
    })
    return reply.status(result.imported || result.updated ? 200 : 422).send(result)
  })

  /** PATCH /inventory/:id — update quantity, price, stock status. */
  app.patch("/inventory/:id", async (request, reply) => {
    const context = await requireProfile(request, reply, ["pharmacist"])
    if (!context) return

    const pharmacyId = await getPharmacyForStaff(context.profile.id)
    if (!pharmacyId) {
      return reply.status(404).send({ error: "No pharmacy assigned" })
    }

    const { id } = request.params as { id: string }
    const parsed = updateInventoryItemSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid data", details: parsed.error.flatten().fieldErrors })
    }

    const updated = await updateInventoryItem(id, pharmacyId, parsed.data)
    if (!updated) {
      return reply.status(404).send({ error: "Item not found" })
    }

    await writeAuditLog({
      actorProfileId: context.profile.id,
      action: "inventory.update",
      entityType: "inventory_item",
      entityId: id,
      details: {
        pharmacyId,
        quantity: parsed.data.quantity,
        unitPriceEtb: parsed.data.unitPriceEtb,
        stockStatus: parsed.data.stockStatus,
      },
    })

    return updated
  })

  /** DELETE /inventory/:id — remove an inventory item. */
  app.delete("/inventory/:id", async (request, reply) => {
    const context = await requireProfile(request, reply, ["pharmacist"])
    if (!context) return

    const pharmacyId = await getPharmacyForStaff(context.profile.id)
    if (!pharmacyId) {
      return reply.status(404).send({ error: "No pharmacy assigned" })
    }

    const { id } = request.params as { id: string }
    const deleted = await deleteInventoryItem(id, pharmacyId)
    if (!deleted) {
      return reply.status(404).send({ error: "Item not found" })
    }

    await writeAuditLog({
      actorProfileId: context.profile.id,
      action: "inventory.delete",
      entityType: "inventory_item",
      entityId: id,
      details: {
        pharmacyId,
      },
    })

    return { success: true }
  })

  /** GET /medicines/list — all medicines for dropdown. */
  app.get("/medicines/list", async (request, reply) => {
    const context = await requireProfile(request, reply, ["pharmacist", "admin"])
    if (!context) return

    return { medicines: await listMedicines() }
  })
}
