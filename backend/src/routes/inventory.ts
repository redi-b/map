import type { FastifyPluginAsync } from "fastify"
import { requireProfile } from "../lib/auth-context.js"
import {
  addInventoryItem,
  deleteInventoryItem,
  getPharmacyForStaff,
  listInventory,
  listMedicines,
  updateInventoryItem,
} from "../services/inventory.js"
import { addInventoryItemSchema, updateInventoryItemSchema } from "../validators/inventory.js"

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
    return reply.status(201).send(item)
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

    return { success: true }
  })

  /** GET /medicines/list — all medicines for dropdown. */
  app.get("/medicines/list", async (request, reply) => {
    const context = await requireProfile(request, reply, ["pharmacist", "admin"])
    if (!context) return

    return { medicines: await listMedicines() }
  })
}
