import { z } from "zod"
import { cleanString } from "../lib/sanitize.js"

export const sendAssistantMessageSchema = z.object({
  content: cleanString(z.string().min(2).max(1200)),
})

export type SendAssistantMessageInput = z.infer<typeof sendAssistantMessageSchema>
