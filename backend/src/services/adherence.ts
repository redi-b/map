import { and, asc, eq, gte, lt } from "drizzle-orm"
import { db } from "../db/client.js"
import { doseEvents, medicationReminders } from "../db/schema.js"
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

export async function listTodayAdherence(patientProfileId: string) {
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

  await db.insert(doseEvents).values({
    reminderId: reminder.id,
    scheduledAt: nextDoseAt,
    status: "upcoming",
  })

  await createNotification(
    patientProfileId,
    `Reminder set for ${input.medicineName} ${input.dosage}.`,
    "reminder",
    reminder.id,
  )

  return reminder
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
