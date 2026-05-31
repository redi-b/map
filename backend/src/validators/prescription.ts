import { z } from "zod"
import { cleanString } from "../lib/sanitize.js"

function requireCollectionDetails<T extends { isDelivery?: boolean; deliveryAddress?: string; proxyName?: string; proxyPhone?: string }>(
  input: T,
  ctx: z.RefinementCtx,
) {
  if (input.isDelivery && !input.deliveryAddress) {
    ctx.addIssue({
      code: "custom",
      path: ["deliveryAddress"],
      message: "Delivery address is required for delivery requests",
    })
  }

  if (!input.proxyName && input.proxyPhone) {
    ctx.addIssue({
      code: "custom",
      path: ["proxyName"],
      message: "Proxy name is required when a proxy phone is provided",
    })
  }
}

export const createPrescriptionSchema = z.object({
  pharmacyId: z.string().uuid(),
  notes: cleanString(z.string().max(500)).optional(),
  isDelivery: z.boolean().default(false),
  deliveryAddress: cleanString(z.string().max(200)).optional(),
  proxyName: cleanString(z.string().max(100)).optional(),
  proxyPhone: cleanString(z.string().max(20)).optional(),
}).superRefine(requireCollectionDetails)

export const reviewPrescriptionSchema = z.object({
  action: z.enum(["approve", "reject", "request_resubmit", "suggest_alternate"]),
  instructions: cleanString(z.string().max(500)).optional(),
  estimatedCostEtb: z.number().positive().optional(),
  alternativeMedicineId: z.string().uuid().optional(),
})

export const createAvailabilityRequestSchema = z.object({
  pharmacyId: z.string().uuid().optional().nullable(),
  medicineName: cleanString(z.string().min(1).max(200)),
  notes: cleanString(z.string().max(500)).optional(),
  isDelivery: z.boolean().default(false),
  deliveryAddress: cleanString(z.string().max(200)).optional(),
  proxyName: cleanString(z.string().max(100)).optional(),
  proxyPhone: cleanString(z.string().max(20)).optional(),
}).superRefine(requireCollectionDetails)

export const respondToRequestSchema = z.object({
  response: z.enum(["available", "not_available", "alternate"]),
  alternativeMedicineName: cleanString(z.string().max(200)).optional(),
  estimatedPriceEtb: z.number().positive().optional(),
  notes: cleanString(z.string().max(500)).optional(),
})

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>
export type ReviewPrescriptionInput = z.infer<typeof reviewPrescriptionSchema>
export type CreateAvailabilityRequestInput = z.infer<typeof createAvailabilityRequestSchema>
export type RespondToRequestInput = z.infer<typeof respondToRequestSchema>
