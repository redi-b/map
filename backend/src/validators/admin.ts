import { z } from "zod"
import { cleanString } from "../lib/sanitize.js"

export const createAdminPharmacySchema = z.object({
  name: cleanString(z.string().min(1).max(120)),
  branchName: cleanString(z.string().max(120)).optional(),
  licenseNumber: cleanString(z.string().min(1).max(80)),
  address: cleanString(z.string().min(1).max(200)),
  neighborhood: cleanString(z.string().min(1).max(120)),
  phone: cleanString(z.string().min(1).max(30)),
  email: cleanString(z.email()).optional().or(z.literal("")),
  supportsDelivery: z.boolean().default(false),
  operatingHours: cleanString(z.string().max(120)).optional(),
  isVerified: z.boolean().default(false),
  primaryContactName: cleanString(z.string().min(2).max(120)),
  primaryContactEmail: cleanString(z.email()),
  primaryContactPhone: cleanString(z.string().max(30)).optional(),
})

export const verifyAdminPharmacySchema = z.object({
  isVerified: z.boolean(),
})

export const updateAdminUserSchema = z.object({
  role: z.enum(["patient", "pharmacist", "admin"]).optional(),
  isActive: z.boolean().optional(),
  pharmacyId: z.string().uuid().nullable().optional(),
}).refine((input) => input.role !== undefined || input.isActive !== undefined || input.pharmacyId !== undefined, {
  message: "At least one field is required",
})

export const createAdminUserSchema = z.object({
  fullName: cleanString(z.string().min(2).max(120)),
  email: cleanString(z.email()),
  phone: cleanString(z.string().max(30)).optional(),
  role: z.literal("pharmacist"),
  pharmacyId: z.string().uuid(),
})

export type CreateAdminPharmacyInput = z.infer<typeof createAdminPharmacySchema>
export type VerifyAdminPharmacyInput = z.infer<typeof verifyAdminPharmacySchema>
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>
export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>
