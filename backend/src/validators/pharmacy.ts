import { z } from "zod"

export const completePasswordSetupSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
})

export type CompletePasswordSetupInput = z.infer<typeof completePasswordSetupSchema>
