import { and, desc, eq } from "drizzle-orm"
import { db } from "../db/client.js"
import { notifications, type notificationSource } from "../db/schema.js"

type NotificationSource = (typeof notificationSource.enumValues)[number]

export async function createNotification(
  recipientProfileId: string,
  message: string,
  source: NotificationSource = "system",
  sourceEntityId?: string,
) {
  const [notification] = await db
    .insert(notifications)
    .values({ recipientProfileId, message, source, sourceEntityId })
    .returning()

  return notification
}

export async function listNotifications(profileId: string, limit = 20, unreadOnly = false) {
  const conditions = [eq(notifications.recipientProfileId, profileId)]

  if (unreadOnly) {
    conditions.push(eq(notifications.isRead, false))
  }

  return db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.dateSent))
    .limit(limit)
}

export async function markAsRead(notificationId: string, profileId: string) {
  const [updated] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.recipientProfileId, profileId),
      ),
    )
    .returning()

  return updated ?? null
}

export async function markAllAsRead(profileId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.recipientProfileId, profileId),
        eq(notifications.isRead, false),
      ),
    )
}

export async function getUnreadCount(profileId: string) {
  const unread = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientProfileId, profileId),
        eq(notifications.isRead, false),
      ),
    )

  return unread.length
}
