import { z } from "zod"
import { cleanString } from "../lib/sanitize.js"

export const medicineSearchQuery = z.object({
  q: cleanString(z.string()).default(""),
  neighborhood: cleanString(z.string()).optional(),
  inStock: z.coerce.boolean().optional(),
  delivery: z.coerce.boolean().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25),
})

export const medicineSuggestionQuery = z.object({
  q: cleanString(z.string()).default(""),
  limit: z.coerce.number().int().min(1).max(10).default(8),
})

export type MedicineSearchQuery = z.infer<typeof medicineSearchQuery>
export type MedicineSuggestionQuery = z.infer<typeof medicineSuggestionQuery>
