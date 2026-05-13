import { z } from "zod"
import { cleanString } from "../lib/sanitize.js"

export const addInventoryItemSchema = z.object({
  medicineId: z.string().uuid(),
  quantity: z.number().int().min(0),
  unitPriceEtb: z.number().positive(),
  stockStatus: z.enum(["in_stock", "low_stock", "out_of_stock"]).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
})

export const updateInventoryItemSchema = z.object({
  quantity: z.number().int().min(0).optional(),
  unitPriceEtb: z.number().positive().optional(),
  stockStatus: z.enum(["in_stock", "low_stock", "out_of_stock"]).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
})

export const batchInventoryItemSchema = z.object({
  medicineId: z.string().uuid().optional(),
  medicineName: cleanString(z.string().min(1)).optional(),
  form: cleanString(z.string().min(1)).optional(),
  strength: cleanString(z.string().min(1)).optional().nullable(),
  quantity: z.number().int().min(0),
  unitPriceEtb: z.number().positive(),
  stockStatus: z.enum(["in_stock", "low_stock", "out_of_stock"]).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
}).refine((value) => value.medicineId || value.medicineName, {
  message: "Provide a medicine id or medicine name",
  path: ["medicineName"],
})

export const batchInventoryItemsSchema = z.object({
  items: z.array(batchInventoryItemSchema).min(1).max(200),
})

export type AddInventoryItemInput = z.infer<typeof addInventoryItemSchema>
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>
export type BatchInventoryItemInput = z.infer<typeof batchInventoryItemSchema>
