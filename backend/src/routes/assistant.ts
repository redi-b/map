import type { FastifyPluginAsync } from "fastify"
import { requireProfile } from "../lib/auth-context.js"
import {
  createAssistantSession,
  deleteAssistantSession,
  listAssistantSessions,
  sendAssistantMessage,
} from "../services/assistant.js"
import { sendAssistantMessageSchema } from "../validators/assistant.js"

export const assistantRoutes: FastifyPluginAsync = async (app) => {
  app.get("/assistant/sessions", async (request, reply) => {
    const context = await requireProfile(request, reply, ["patient"])
    if (!context) return

    return { sessions: await listAssistantSessions(context.profile.id) }
  })

  app.post("/assistant/sessions", async (request, reply) => {
    const context = await requireProfile(request, reply, ["patient"])
    if (!context) return

    const session = await createAssistantSession(context.profile.id)
    return reply.status(201).send(session)
  })

  app.post("/assistant/sessions/:id/messages", async (request, reply) => {
    const context = await requireProfile(request, reply, ["patient"])
    if (!context) return

    const parsed = sendAssistantMessageSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid data", details: parsed.error.flatten().fieldErrors })
    }

    const { id } = request.params as { id: string }
    const session = await sendAssistantMessage(context.profile.id, id, parsed.data.content)

    if (!session) {
      return reply.status(404).send({ error: "Conversation not found" })
    }

    return session
  })

  app.delete("/assistant/sessions/:id", async (request, reply) => {
    const context = await requireProfile(request, reply, ["patient"])
    if (!context) return

    const { id } = request.params as { id: string }
    const deleted = await deleteAssistantSession(context.profile.id, id)

    if (!deleted) {
      return reply.status(404).send({ error: "Conversation not found" })
    }

    return { success: true }
  })
}
