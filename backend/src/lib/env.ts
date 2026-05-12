import { z } from "zod"

const schema = z.object({
  DATABASE_URL: z.string().url().optional(),
  BETTER_AUTH_SECRET: z.string().min(16).optional(),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:4000"),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PRESCRIPTION_IMAGE_KEY: z.string().min(32).optional(),
  PRESCRIPTION_STORAGE_DIR: z.string().default("storage/prescriptions"),
})

export const env = schema.parse(process.env)
