import { z } from "zod"

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

export type AddInventoryItemInput = z.infer<typeof addInventoryItemSchema>
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>
