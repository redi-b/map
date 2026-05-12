import { z } from "zod"

export const createAdminPharmacySchema = z.object({
  name: z.string().min(1).max(120),
  branchName: z.string().max(120).optional(),
  licenseNumber: z.string().min(1).max(80),
  address: z.string().min(1).max(200),
  neighborhood: z.string().min(1).max(120),
  phone: z.string().min(1).max(30),
  email: z.email().optional().or(z.literal("")),
  supportsDelivery: z.boolean().default(false),
  operatingHours: z.string().max(120).optional(),
  isVerified: z.boolean().default(false),
})

export const verifyAdminPharmacySchema = z.object({
  isVerified: z.boolean(),
})

export type CreateAdminPharmacyInput = z.infer<typeof createAdminPharmacySchema>
export type VerifyAdminPharmacyInput = z.infer<typeof verifyAdminPharmacySchema>
