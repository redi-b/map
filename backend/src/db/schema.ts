import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const userRole = pgEnum("user_role", ["patient", "pharmacist", "admin"])
export const requestStatus = pgEnum("request_status", [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "completed",
])
export const stockStatus = pgEnum("stock_status", ["in_stock", "low_stock", "out_of_stock"])

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  authUserId: text("auth_user_id").notNull().unique(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: userRole("role").notNull().default("patient"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const pharmacies = pgTable("pharmacies", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerProfileId: uuid("owner_profile_id").references(() => profiles.id),
  name: text("name").notNull(),
  branchName: text("branch_name"),
  licenseNumber: text("license_number").notNull(),
  address: text("address").notNull(),
  neighborhood: text("neighborhood").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const medicines = pgTable("medicines", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  form: text("form").notNull(),
  strength: text("strength"),
  category: text("category").notNull(),
  manufacturer: text("manufacturer"),
})

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  pharmacyId: uuid("pharmacy_id").notNull().references(() => pharmacies.id),
  medicineId: uuid("medicine_id").notNull().references(() => medicines.id),
  quantity: integer("quantity").notNull().default(0),
  unitPriceEtb: numeric("unit_price_etb", { precision: 10, scale: 2 }).notNull(),
  stockStatus: stockStatus("stock_status").notNull().default("in_stock"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const prescriptionRequests = pgTable("prescription_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientProfileId: uuid("patient_profile_id").notNull().references(() => profiles.id),
  pharmacyId: uuid("pharmacy_id").references(() => pharmacies.id),
  status: requestStatus("status").notNull().default("submitted"),
  prescriptionImageUrl: text("prescription_image_url"),
  notes: text("notes"),
  proxyName: text("proxy_name"),
  proxyPhone: text("proxy_phone"),
  isDelivery: boolean("is_delivery").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const medicationReminders = pgTable("medication_reminders", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientProfileId: uuid("patient_profile_id").notNull().references(() => profiles.id),
  medicineName: text("medicine_name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  nextDoseAt: timestamp("next_dose_at", { withTimezone: true }).notNull(),
  supplyRemainingDays: integer("supply_remaining_days"),
  isActive: boolean("is_active").notNull().default(true),
})
