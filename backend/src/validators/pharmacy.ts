import { z } from "zod"

export const assignPharmacySchema = z.object({
  pharmacyId: z.string().uuid(),
})

export type AssignPharmacyInput = z.infer<typeof assignPharmacySchema>
