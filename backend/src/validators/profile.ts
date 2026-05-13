import { z } from "zod"
import { cleanString } from "../lib/sanitize.js"

export const ethiopianPhoneRegex = /^\+251\d{9}$/

export const createProfileSchema = z.object({
  fullName: cleanString(z.string().min(2, "Name must be at least 2 characters").max(120)),
  phone: cleanString(z
    .string()
    .regex(ethiopianPhoneRegex, "Phone must be a valid Ethiopian number (+251XXXXXXXXX)")
  )
    .optional()
    .or(z.literal("")),
  role: z.enum(["patient"]),
})

/**
 * Admin-only profile assignment — allows setting any role.
 * Used when admin creates pharmacist or admin accounts.
 */
export const adminAssignProfileSchema = z.object({
  fullName: cleanString(z.string().min(2).max(120)),
  phone: cleanString(z
    .string()
    .regex(ethiopianPhoneRegex, "Phone must be a valid Ethiopian number (+251XXXXXXXXX)")
  )
    .optional()
    .or(z.literal("")),
  role: z.enum(["patient", "pharmacist", "admin"]),
})

export type CreateProfileInput = z.infer<typeof createProfileSchema>
export type AdminAssignProfileInput = z.infer<typeof adminAssignProfileSchema>
