import type { FastifyPluginAsync } from "fastify"
import { requireProfile } from "../lib/auth-context.js"
import {
  createReminder,
  listTodayAdherence,
  resetTodayDoseEvents,
  updateDoseEvent,
} from "../services/adherence.js"
import { createReminderSchema, updateDoseEventSchema } from "../validators/adherence.js"

export const adherenceRoutes: FastifyPluginAsync = async (app) => {
  app.get("/adherence/today", async (request, reply) => {
    const context = await requireProfile(request, reply, ["patient"])
    if (!context) return

    return listTodayAdherence(context.profile.id)
  })

  app.post("/reminders", async (request, reply) => {
    const context = await requireProfile(request, reply, ["patient"])
    if (!context) return

    const parsed = createReminderSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid data", details: parsed.error.flatten().fieldErrors })
    }

    const reminder = await createReminder(context.profile.id, parsed.data)
    return reply.status(201).send(reminder)
  })

  app.patch("/dose-events/:id", async (request, reply) => {
    const context = await requireProfile(request, reply, ["patient"])
    if (!context) return

    const parsed = updateDoseEventSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid data", details: parsed.error.flatten().fieldErrors })
    }

    const { id } = request.params as { id: string }
    const updated = await updateDoseEvent(context.profile.id, id, parsed.data)

    if (!updated) {
      return reply.status(404).send({ error: "Dose event not found" })
    }

    return updated
  })

  app.post("/adherence/today/reset", async (request, reply) => {
    const context = await requireProfile(request, reply, ["patient"])
    if (!context) return

    const resetCount = await resetTodayDoseEvents(context.profile.id)
    return { resetCount }
  })
}
