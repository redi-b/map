import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

// ─── Better Auth tables (managed externally) ─────────────────────────────────

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

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRole = pgEnum("user_role", ["patient", "pharmacist", "admin"])

export const requestStatus = pgEnum("request_status", [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "completed",
])

export const prescriptionStatus = pgEnum("prescription_status", [
  "uploaded",
  "under_review",
  "verified",
  "rejected",
])

export const stockStatus = pgEnum("stock_status", ["in_stock", "low_stock", "out_of_stock"])

export const reminderType = pgEnum("reminder_type", ["dose", "refill"])

export const doseEventStatus = pgEnum("dose_event_status", ["taken", "skipped", "upcoming"])

export const notificationSource = pgEnum("notification_source", [
  "prescription",
  "availability_request",
  "reminder",
  "system",
])

// ─── Core domain tables ──────────────────────────────────────────────────────

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  authUserId: text("auth_user_id").notNull().unique(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: userRole("role").notNull().default("patient"),
  isActive: boolean("is_active").notNull().default(true),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

/** Extended patient information (DOB, address, emergency contact, allergies). */
export const patientDetails = pgTable("patient_details", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").notNull().unique().references(() => profiles.id, { onDelete: "cascade" }),
  dateOfBirth: timestamp("date_of_birth", { withTimezone: true }),
  address: text("address"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  allergies: text("allergies"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// ─── Pharmacy tables ─────────────────────────────────────────────────────────

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
  supportsDelivery: boolean("supports_delivery").notNull().default(false),
  operatingHours: text("operating_hours"),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

/** Links pharmacist profiles to pharmacies. */
export const pharmacyStaff = pgTable("pharmacy_staff", {
  id: uuid("id").defaultRandom().primaryKey(),
  pharmacyId: uuid("pharmacy_id").notNull().references(() => pharmacies.id, { onDelete: "cascade" }),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  roleInPharmacy: text("role_in_pharmacy").notNull().default("pharmacist"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// ─── Medicine tables ─────────────────────────────────────────────────────────

export const medicines = pgTable("medicines", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  form: text("form").notNull(),
  strength: text("strength"),
  category: text("category").notNull(),
  manufacturer: text("manufacturer"),
}, (table) => [
  index("idx_medicines_name").on(table.name),
  index("idx_medicines_category").on(table.category),
])

/** Brand names, spelling variants, and aliases for improved search. */
export const medicineAliases = pgTable("medicine_aliases", {
  id: uuid("id").defaultRandom().primaryKey(),
  medicineId: uuid("medicine_id").notNull().references(() => medicines.id, { onDelete: "cascade" }),
  alias: text("alias").notNull(),
}, (table) => [
  index("idx_medicine_aliases_alias").on(table.alias),
])

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  pharmacyId: uuid("pharmacy_id").notNull().references(() => pharmacies.id),
  medicineId: uuid("medicine_id").notNull().references(() => medicines.id),
  quantity: integer("quantity").notNull().default(0),
  unitPriceEtb: numeric("unit_price_etb", { precision: 10, scale: 2 }).notNull(),
  stockStatus: stockStatus("stock_status").notNull().default("in_stock"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_inventory_pharmacy").on(table.pharmacyId),
  index("idx_inventory_medicine").on(table.medicineId),
  index("idx_inventory_stock_status").on(table.stockStatus),
])

// ─── Prescription workflow ───────────────────────────────────────────────────

export const prescriptions = pgTable("prescriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientProfileId: uuid("patient_profile_id").notNull().references(() => profiles.id),
  pharmacyId: uuid("pharmacy_id").notNull().references(() => pharmacies.id),
  status: prescriptionStatus("status").notNull().default("uploaded"),
  imageUrl: text("image_url"),
  imageMimeType: text("image_mime_type"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_prescriptions_patient").on(table.patientProfileId),
  index("idx_prescriptions_pharmacy").on(table.pharmacyId),
  index("idx_prescriptions_status").on(table.status),
])

/** Pharmacist review actions on prescriptions. */
export const prescriptionReviews = pgTable("prescription_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  prescriptionId: uuid("prescription_id").notNull().references(() => prescriptions.id, { onDelete: "cascade" }),
  reviewerProfileId: uuid("reviewer_profile_id").notNull().references(() => profiles.id),
  action: text("action").notNull(), // approve, reject, request_resubmit, suggest_alternate
  instructions: text("instructions"),
  estimatedCostEtb: numeric("estimated_cost_etb", { precision: 10, scale: 2 }),
  alternativeMedicineId: uuid("alternative_medicine_id").references(() => medicines.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// ─── Availability requests ───────────────────────────────────────────────────

export const availabilityRequests = pgTable("availability_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientProfileId: uuid("patient_profile_id").notNull().references(() => profiles.id),
  pharmacyId: uuid("pharmacy_id").references(() => pharmacies.id), // null = broadcast to all
  medicineName: text("medicine_name").notNull(),
  notes: text("notes"),
  status: requestStatus("status").notNull().default("submitted"),
  isDelivery: boolean("is_delivery").notNull().default(false),
  deliveryAddress: text("delivery_address"),
  proxyName: text("proxy_name"),
  proxyPhone: text("proxy_phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_avail_req_patient").on(table.patientProfileId),
  index("idx_avail_req_pharmacy").on(table.pharmacyId),
  index("idx_avail_req_status").on(table.status),
])

/** Pharmacy responses to availability requests. */
export const requestResponses = pgTable("request_responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").notNull().references(() => availabilityRequests.id, { onDelete: "cascade" }),
  pharmacyId: uuid("pharmacy_id").notNull().references(() => pharmacies.id),
  responderProfileId: uuid("responder_profile_id").notNull().references(() => profiles.id),
  response: text("response").notNull(), // available, not_available, alternate
  alternativeMedicineName: text("alternative_medicine_name"),
  estimatedPriceEtb: numeric("estimated_price_etb", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// ─── Adherence and reminders ─────────────────────────────────────────────────

export const medicationReminders = pgTable("medication_reminders", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientProfileId: uuid("patient_profile_id").notNull().references(() => profiles.id),
  medicineName: text("medicine_name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  durationDays: integer("duration_days"),
  nextDoseAt: timestamp("next_dose_at", { withTimezone: true }).notNull(),
  supplyRemainingDays: integer("supply_remaining_days"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_reminders_patient").on(table.patientProfileId),
])

/** Individual dose events — taken, skipped, or upcoming. */
export const doseEvents = pgTable("dose_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  reminderId: uuid("reminder_id").notNull().references(() => medicationReminders.id, { onDelete: "cascade" }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  status: doseEventStatus("status").notNull().default("upcoming"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }),
})

// ─── Notifications ───────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  recipientProfileId: uuid("recipient_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  source: notificationSource("source").notNull().default("system"),
  sourceEntityId: uuid("source_entity_id"), // optional FK to the thing that caused it
  isRead: boolean("is_read").notNull().default(false),
  dateSent: timestamp("date_sent", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_notifications_recipient").on(table.recipientProfileId),
  index("idx_notifications_read").on(table.isRead),
])

// ─── AI assistant ────────────────────────────────────────────────────────────

export const aiChatSessions = pgTable("ai_chat_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientProfileId: uuid("patient_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const aiChatMessages = pgTable("ai_chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => aiChatSessions.id, { onDelete: "cascade" }),
  senderType: text("sender_type").notNull(), // user, assistant
  content: text("content").notNull(),
  hasDisclaimer: boolean("has_disclaimer").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// ─── Audit log ───────────────────────────────────────────────────────────────

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorProfileId: uuid("actor_profile_id").references(() => profiles.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(), // pharmacy, prescription, user, etc.
  entityId: text("entity_id"),
  details: text("details"), // JSON string with extra context
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_audit_actor").on(table.actorProfileId),
  index("idx_audit_entity").on(table.entityType, table.entityId),
])

// ─── Legacy table (kept for migration compatibility) ─────────────────────────
// This table predates the separate prescriptions + availability_requests tables.
// It will be removed once data is migrated.
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
