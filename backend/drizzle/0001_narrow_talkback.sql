CREATE TYPE "public"."dose_event_status" AS ENUM('taken', 'skipped', 'upcoming');--> statement-breakpoint
CREATE TYPE "public"."notification_source" AS ENUM('prescription', 'availability_request', 'reminder', 'system');--> statement-breakpoint
CREATE TYPE "public"."prescription_status" AS ENUM('uploaded', 'under_review', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."reminder_type" AS ENUM('dose', 'refill');--> statement-breakpoint
CREATE TABLE "ai_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"sender_type" text NOT NULL,
	"content" text NOT NULL,
	"has_disclaimer" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_profile_id" uuid NOT NULL,
	"title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_profile_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_profile_id" uuid NOT NULL,
	"pharmacy_id" uuid,
	"medicine_name" text NOT NULL,
	"notes" text,
	"status" "request_status" DEFAULT 'submitted' NOT NULL,
	"is_delivery" boolean DEFAULT false NOT NULL,
	"delivery_address" text,
	"proxy_name" text,
	"proxy_phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dose_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reminder_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" "dose_event_status" DEFAULT 'upcoming' NOT NULL,
	"recorded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "medicine_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medicine_id" uuid NOT NULL,
	"alias" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_profile_id" uuid NOT NULL,
	"message" text NOT NULL,
	"source" "notification_source" DEFAULT 'system' NOT NULL,
	"source_entity_id" uuid,
	"is_read" boolean DEFAULT false NOT NULL,
	"date_sent" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"date_of_birth" timestamp with time zone,
	"address" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"allergies" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_details_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "pharmacy_staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"role_in_pharmacy" text DEFAULT 'pharmacist' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescription_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prescription_id" uuid NOT NULL,
	"reviewer_profile_id" uuid NOT NULL,
	"action" text NOT NULL,
	"instructions" text,
	"estimated_cost_etb" numeric(10, 2),
	"alternative_medicine_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_profile_id" uuid NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"status" "prescription_status" DEFAULT 'uploaded' NOT NULL,
	"image_url" text,
	"image_mime_type" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"responder_profile_id" uuid NOT NULL,
	"response" text NOT NULL,
	"alternative_medicine_name" text,
	"estimated_price_etb" numeric(10, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "medication_reminders" ADD COLUMN "start_date" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "medication_reminders" ADD COLUMN "duration_days" integer;--> statement-breakpoint
ALTER TABLE "medication_reminders" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "pharmacies" ADD COLUMN "supports_delivery" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pharmacies" ADD COLUMN "operating_hours" text;--> statement-breakpoint
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_session_id_ai_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_patient_profile_id_profiles_id_fk" FOREIGN KEY ("patient_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_profile_id_profiles_id_fk" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_requests" ADD CONSTRAINT "availability_requests_patient_profile_id_profiles_id_fk" FOREIGN KEY ("patient_profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_requests" ADD CONSTRAINT "availability_requests_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dose_events" ADD CONSTRAINT "dose_events_reminder_id_medication_reminders_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "public"."medication_reminders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicine_aliases" ADD CONSTRAINT "medicine_aliases_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_profile_id_profiles_id_fk" FOREIGN KEY ("recipient_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_details" ADD CONSTRAINT "patient_details_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_staff" ADD CONSTRAINT "pharmacy_staff_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_staff" ADD CONSTRAINT "pharmacy_staff_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_reviews" ADD CONSTRAINT "prescription_reviews_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_reviews" ADD CONSTRAINT "prescription_reviews_reviewer_profile_id_profiles_id_fk" FOREIGN KEY ("reviewer_profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_reviews" ADD CONSTRAINT "prescription_reviews_alternative_medicine_id_medicines_id_fk" FOREIGN KEY ("alternative_medicine_id") REFERENCES "public"."medicines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_profile_id_profiles_id_fk" FOREIGN KEY ("patient_profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_responses" ADD CONSTRAINT "request_responses_request_id_availability_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."availability_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_responses" ADD CONSTRAINT "request_responses_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_responses" ADD CONSTRAINT "request_responses_responder_profile_id_profiles_id_fk" FOREIGN KEY ("responder_profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_actor" ON "audit_logs" USING btree ("actor_profile_id");--> statement-breakpoint
CREATE INDEX "idx_audit_entity" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_avail_req_patient" ON "availability_requests" USING btree ("patient_profile_id");--> statement-breakpoint
CREATE INDEX "idx_avail_req_pharmacy" ON "availability_requests" USING btree ("pharmacy_id");--> statement-breakpoint
CREATE INDEX "idx_avail_req_status" ON "availability_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_medicine_aliases_alias" ON "medicine_aliases" USING btree ("alias");--> statement-breakpoint
CREATE INDEX "idx_notifications_recipient" ON "notifications" USING btree ("recipient_profile_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_read" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_prescriptions_patient" ON "prescriptions" USING btree ("patient_profile_id");--> statement-breakpoint
CREATE INDEX "idx_prescriptions_pharmacy" ON "prescriptions" USING btree ("pharmacy_id");--> statement-breakpoint
CREATE INDEX "idx_prescriptions_status" ON "prescriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_inventory_pharmacy" ON "inventory_items" USING btree ("pharmacy_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_medicine" ON "inventory_items" USING btree ("medicine_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_stock_status" ON "inventory_items" USING btree ("stock_status");--> statement-breakpoint
CREATE INDEX "idx_reminders_patient" ON "medication_reminders" USING btree ("patient_profile_id");--> statement-breakpoint
CREATE INDEX "idx_medicines_name" ON "medicines" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_medicines_category" ON "medicines" USING btree ("category");
