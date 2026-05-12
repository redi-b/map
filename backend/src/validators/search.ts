import { z } from "zod"

export const medicineSearchQuery = z.object({
  q: z.string().default(""),
  neighborhood: z.string().optional(),
  inStock: z.coerce.boolean().optional(),
  delivery: z.coerce.boolean().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25),
})

export const medicineSuggestionQuery = z.object({
  q: z.string().default(""),
  limit: z.coerce.number().int().min(1).max(10).default(8),
})

export type MedicineSearchQuery = z.infer<typeof medicineSearchQuery>
export type MedicineSuggestionQuery = z.infer<typeof medicineSuggestionQuery>
