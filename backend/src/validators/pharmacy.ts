import { z } from "zod"

export const completePasswordSetupSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
})

export const updatePharmacyLocationSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
})

export type CompletePasswordSetupInput = z.infer<typeof completePasswordSetupSchema>
export type UpdatePharmacyLocationInput = z.infer<typeof updatePharmacyLocationSchema>
