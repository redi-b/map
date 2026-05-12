import { z } from "zod"

const schema = z.object({
  DATABASE_URL: z.string().url().optional(),
  BETTER_AUTH_SECRET: z.string().min(16).optional(),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:4000"),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PRESCRIPTION_IMAGE_KEY: z.string().min(32).optional(),
  PRESCRIPTION_STORAGE_PROVIDER: z.enum(["fs", "r2"]).default("fs"),
  PRESCRIPTION_STORAGE_DIR: z.string().default("storage/prescriptions"),
  R2_BUCKET: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ENDPOINT: z.string().url().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
})

export const env = schema.parse(process.env)
