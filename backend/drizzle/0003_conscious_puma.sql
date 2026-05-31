ALTER TABLE "prescriptions" ADD COLUMN "is_delivery" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "delivery_address" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "proxy_name" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "proxy_phone" text;