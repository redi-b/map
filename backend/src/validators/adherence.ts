import { z } from "zod"
import { cleanString } from "../lib/sanitize.js"

export const createReminderSchema = z.object({
  medicineName: cleanString(z.string().min(2)),
  dosage: cleanString(z.string().min(1)),
  frequency: cleanString(z.string().min(2)),
  nextDoseAt: z.string().datetime(),
  startDate: z.string().datetime().optional(),
  durationDays: z.coerce.number().int().positive().optional(),
  supplyRemainingDays: z.coerce.number().int().nonnegative().optional(),
})

export const updateDoseEventSchema = z.object({
  status: z.enum(["taken", "skipped", "upcoming"]),
})

export type CreateReminderInput = z.infer<typeof createReminderSchema>
export type UpdateDoseEventInput = z.infer<typeof updateDoseEventSchema>
