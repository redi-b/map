import { z } from "zod"

export const createPrescriptionSchema = z.object({
  pharmacyId: z.string().uuid(),
  notes: z.string().max(500).optional(),
  isDelivery: z.boolean().default(false),
  deliveryAddress: z.string().max(200).optional(),
  proxyName: z.string().max(100).optional(),
  proxyPhone: z.string().max(20).optional(),
})

export const reviewPrescriptionSchema = z.object({
  action: z.enum(["approve", "reject", "request_resubmit", "suggest_alternate"]),
  instructions: z.string().max(500).optional(),
  estimatedCostEtb: z.number().positive().optional(),
  alternativeMedicineId: z.string().uuid().optional(),
})

export const createAvailabilityRequestSchema = z.object({
  pharmacyId: z.string().uuid().optional().nullable(),
  medicineName: z.string().min(1).max(200),
  notes: z.string().max(500).optional(),
  isDelivery: z.boolean().default(false),
  deliveryAddress: z.string().max(200).optional(),
  proxyName: z.string().max(100).optional(),
  proxyPhone: z.string().max(20).optional(),
})

export const respondToRequestSchema = z.object({
  response: z.enum(["available", "not_available", "alternate"]),
  alternativeMedicineName: z.string().max(200).optional(),
  estimatedPriceEtb: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
})

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>
export type ReviewPrescriptionInput = z.infer<typeof reviewPrescriptionSchema>
export type CreateAvailabilityRequestInput = z.infer<typeof createAvailabilityRequestSchema>
export type RespondToRequestInput = z.infer<typeof respondToRequestSchema>
