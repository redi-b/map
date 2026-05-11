import { z } from "zod"

export const createReminderSchema = z.object({
  medicineName: z.string().trim().min(2),
  dosage: z.string().trim().min(1),
  frequency: z.string().trim().min(2),
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
