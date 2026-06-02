import { and, asc, eq, gte, lt } from "drizzle-orm"
import { db } from "../db/client.js"
import { doseEvents, medicationReminders, notifications } from "../db/schema.js"
import type { CreateReminderInput, UpdateDoseEventInput } from "../validators/adherence.js"
import { createNotification } from "./notification.js"

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return { start, end }
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

async function notificationExistsToday(patientProfileId: string, sourceEntityId: string, message: string) {
  const { start, end } = todayRange()
  const [existing] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientProfileId, patientProfileId),
        eq(notifications.source, "reminder"),
        eq(notifications.sourceEntityId, sourceEntityId),
        eq(notifications.message, message),
        gte(notifications.dateSent, start),
        lt(notifications.dateSent, end),
      ),
    )
    .limit(1)

  return Boolean(existing)
}

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate()
}

function doseTimesForReminder(nextDoseAt: Date, frequency: string) {
  const normalized = frequency.toLowerCase()
  const offsets = normalized.includes("every 8 hours")
    ? [0, 8]
    : normalized.includes("twice daily")
      ? [0, 12]
      : [0]

  return offsets
    .map((hours) => new Date(nextDoseAt.getTime() + hours * 60 * 60 * 1000))
    .filter((date) => sameDay(date, nextDoseAt))
}

export async function listTodayAdherence(patientProfileId: string) {
  await syncAdherenceNotifications(patientProfileId)

  const { start, end } = todayRange()
  const rows = await db
    .select({
      id: doseEvents.id,
      reminderId: medicationReminders.id,
      medicine: medicationReminders.medicineName,
      dosage: medicationReminders.dosage,
      frequency: medicationReminders.frequency,
      scheduledAt: doseEvents.scheduledAt,
      status: doseEvents.status,
      supplyRemainingDays: medicationReminders.supplyRemainingDays,
    })
    .from(doseEvents)
    .innerJoin(medicationReminders, eq(doseEvents.reminderId, medicationReminders.id))
    .where(
      and(
        eq(medicationReminders.patientProfileId, patientProfileId),
        eq(medicationReminders.isActive, true),
        gte(doseEvents.scheduledAt, start),
        lt(doseEvents.scheduledAt, end),
      ),
    )
    .orderBy(asc(doseEvents.scheduledAt))

  const takenCount = rows.filter((event) => event.status === "taken").length
  const skippedCount = rows.filter((event) => event.status === "skipped").length
  const upcomingCount = rows.filter((event) => event.status === "upcoming").length
  const progress = rows.length ? Math.round((takenCount / rows.length) * 100) : 0

  return {
    doses: rows.map((row) => ({
      id: row.id,
      reminderId: row.reminderId,
      medicine: row.medicine,
      dosage: row.dosage,
      frequency: row.frequency,
      time: formatTime(row.scheduledAt),
      scheduledAt: row.scheduledAt.toISOString(),
      status: row.status,
    })),
    summary: {
      total: rows.length,
      taken: takenCount,
      skipped: skippedCount,
      upcoming: upcomingCount,
      progress,
      refillAlerts: rows.filter((row) => row.supplyRemainingDays !== null && row.supplyRemainingDays <= 5).length,
    },
  }
}

export async function syncAdherenceNotifications(patientProfileId: string) {
  const { start, end } = todayRange()
  const now = new Date()
  const soon = new Date(now.getTime() + 30 * 60 * 1000)

  const dueRows = await db
    .select({
      id: doseEvents.id,
      medicine: medicationReminders.medicineName,
      dosage: medicationReminders.dosage,
      scheduledAt: doseEvents.scheduledAt,
    })
    .from(doseEvents)
    .innerJoin(medicationReminders, eq(doseEvents.reminderId, medicationReminders.id))
    .where(
      and(
        eq(medicationReminders.patientProfileId, patientProfileId),
        eq(medicationReminders.isActive, true),
        eq(doseEvents.status, "upcoming"),
        gte(doseEvents.scheduledAt, start),
        lt(doseEvents.scheduledAt, soon),
      ),
    )

  let created = 0

  for (const row of dueRows) {
    const isOverdue = row.scheduledAt.getTime() < now.getTime() - 15 * 60 * 1000
    const message = isOverdue
      ? `Overdue dose: ${row.medicine} ${row.dosage} was scheduled for ${formatTime(row.scheduledAt)}.`
      : `Dose due soon: ${row.medicine} ${row.dosage} at ${formatTime(row.scheduledAt)}.`

    if (!(await notificationExistsToday(patientProfileId, row.id, message))) {
      await createNotification(patientProfileId, message, "reminder", row.id)
      created += 1
    }
  }

  const refillRows = await db
    .select({
      id: medicationReminders.id,
      medicine: medicationReminders.medicineName,
      supplyRemainingDays: medicationReminders.supplyRemainingDays,
    })
    .from(medicationReminders)
    .where(
      and(
        eq(medicationReminders.patientProfileId, patientProfileId),
        eq(medicationReminders.isActive, true),
      ),
    )

  for (const row of refillRows.filter((item) => item.supplyRemainingDays !== null && item.supplyRemainingDays <= 5)) {
    const message = `Refill soon: ${row.medicine} has about ${row.supplyRemainingDays} day${row.supplyRemainingDays === 1 ? "" : "s"} of supply left.`

    if (!(await notificationExistsToday(patientProfileId, row.id, message))) {
      await createNotification(patientProfileId, message, "reminder", row.id)
      created += 1
    }
  }

  return { created }
}

export async function createReminder(patientProfileId: string, input: CreateReminderInput) {
  const nextDoseAt = new Date(input.nextDoseAt)
  const [reminder] = await db
    .insert(medicationReminders)
    .values({
      patientProfileId,
      medicineName: input.medicineName,
      dosage: input.dosage,
      frequency: input.frequency,
      startDate: input.startDate ? new Date(input.startDate) : new Date(),
      durationDays: input.durationDays ?? null,
      nextDoseAt,
      supplyRemainingDays: input.supplyRemainingDays ?? null,
    })
    .returning()

  await db.insert(doseEvents).values(doseTimesForReminder(nextDoseAt, input.frequency).map((scheduledAt) => ({
    reminderId: reminder.id,
    scheduledAt,
    status: "upcoming" as const,
  })))

  await createNotification(
    patientProfileId,
    `Reminder set for ${input.medicineName} ${input.dosage}.`,
    "reminder",
    reminder.id,
  )

  return reminder
}

export async function deleteReminder(patientProfileId: string, reminderId: string) {
  const [reminder] = await db
    .update(medicationReminders)
    .set({ isActive: false })
    .where(and(eq(medicationReminders.id, reminderId), eq(medicationReminders.patientProfileId, patientProfileId)))
    .returning()

  return reminder ?? null
}

export async function updateDoseEvent(
  patientProfileId: string,
  doseEventId: string,
  input: UpdateDoseEventInput,
) {
  const [event] = await db
    .select({ id: doseEvents.id })
    .from(doseEvents)
    .innerJoin(medicationReminders, eq(doseEvents.reminderId, medicationReminders.id))
    .where(
      and(
        eq(doseEvents.id, doseEventId),
        eq(medicationReminders.patientProfileId, patientProfileId),
      ),
    )
    .limit(1)

  if (!event) {
    return null
  }

  const [updated] = await db
    .update(doseEvents)
    .set({
      status: input.status,
      recordedAt: input.status === "upcoming" ? null : new Date(),
    })
    .where(eq(doseEvents.id, doseEventId))
    .returning()

  return updated ?? null
}

export async function resetTodayDoseEvents(patientProfileId: string) {
  const { start, end } = todayRange()
  const rows = await db
    .select({ id: doseEvents.id })
    .from(doseEvents)
    .innerJoin(medicationReminders, eq(doseEvents.reminderId, medicationReminders.id))
    .where(
      and(
        eq(medicationReminders.patientProfileId, patientProfileId),
        gte(doseEvents.scheduledAt, start),
        lt(doseEvents.scheduledAt, end),
      ),
    )

  for (const row of rows) {
    await db
      .update(doseEvents)
      .set({ status: "upcoming", recordedAt: null })
      .where(eq(doseEvents.id, row.id))
  }

  return rows.length
}
