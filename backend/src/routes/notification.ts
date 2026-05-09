import type { FastifyPluginAsync } from "fastify"
import { requireProfile } from "../lib/auth-context.js"
import {
  listNotifications,
  markAllAsRead,
  markAsRead,
  getUnreadCount,
} from "../services/notification.js"

export const notificationRoutes: FastifyPluginAsync = async (app) => {
  /** GET /notifications — list recent notifications. */
  app.get("/notifications", async (request, reply) => {
    const context = await requireProfile(request, reply)
    if (!context) return

    const { unread } = request.query as { unread?: string }
    const items = await listNotifications(context.profile.id, 30, unread === "true")

    return {
      items: items.map((n) => ({
        id: n.id,
        message: n.message,
        source: n.source,
        isRead: n.isRead,
        dateSent: n.dateSent.toISOString(),
      })),
    }
  })

  /** GET /notifications/count — unread count for badge. */
  app.get("/notifications/count", async (request, reply) => {
    const context = await requireProfile(request, reply)
    if (!context) return

    return { unread: await getUnreadCount(context.profile.id) }
  })

  /** PATCH /notifications/:id/read — mark one as read. */
  app.patch("/notifications/:id/read", async (request, reply) => {
    const context = await requireProfile(request, reply)
    if (!context) return

    const { id } = request.params as { id: string }
    const updated = await markAsRead(id, context.profile.id)

    if (!updated) {
      return reply.status(404).send({ error: "Notification not found" })
    }

    return { success: true }
  })

  /** POST /notifications/read-all — mark all as read. */
  app.post("/notifications/read-all", async (request, reply) => {
    const context = await requireProfile(request, reply)
    if (!context) return

    await markAllAsRead(context.profile.id)
    return { success: true }
  })
}
