import { z } from "zod"

export const sendAssistantMessageSchema = z.object({
  content: z.string().trim().min(2).max(1200),
})

export type SendAssistantMessageInput = z.infer<typeof sendAssistantMessageSchema>
