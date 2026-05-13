import "dotenv/config"
import cors from "@fastify/cors"
import multipart from "@fastify/multipart"
import rateLimit from "@fastify/rate-limit"
import sensible from "@fastify/sensible"
import Fastify from "fastify"
import type { FastifyError } from "fastify"
import { adherenceRoutes } from "./routes/adherence.js"
import { adminRoutes } from "./routes/admin.js"
import { assistantRoutes } from "./routes/assistant.js"
import { authRoutes } from "./routes/auth.js"
import { availabilityRoutes } from "./routes/availability.js"
import { catalogRoutes } from "./routes/catalog.js"
import { dashboardRoutes } from "./routes/dashboard.js"
import { healthRoutes } from "./routes/health.js"
import { inventoryRoutes } from "./routes/inventory.js"
import { notificationRoutes } from "./routes/notification.js"
import { pharmacySetupRoutes } from "./routes/pharmacy-setup.js"
import { prescriptionRoutes } from "./routes/prescription.js"
import { sessionRoutes } from "./routes/session.js"
import { env } from "./lib/env.js"

const app = Fastify({
  logger: true,
})

app.setErrorHandler((error: FastifyError, request, reply) => {
  const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 600
    ? error.statusCode
    : 500

  request.log.error({ err: error }, "Request failed")

  if (statusCode === 429) {
    return reply.status(429).send({ error: "Too many requests. Try again shortly." })
  }

  if (statusCode === 413) {
    return reply.status(413).send({ error: "Uploaded file is too large." })
  }

  if (statusCode >= 500) {
    return reply.status(500).send({ error: "Something went wrong. Try again shortly." })
  }

  return reply.status(statusCode).send({ error: error.message || "Request failed" })
})

await app.register(cors, {
  origin: env.FRONTEND_ORIGIN,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
})
await app.register(sensible)
await app.register(rateLimit, {
  global: true,
  max: 240,
  timeWindow: "1 minute",
  allowList: (request) => request.url === "/health",
  errorResponseBuilder: () => ({ error: "Too many requests. Try again shortly." }),
})
await app.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
})
await app.register(healthRoutes)
await app.register(adherenceRoutes, { prefix: "/api" })
await app.register(adminRoutes, { prefix: "/api" })
await app.register(assistantRoutes, { prefix: "/api" })
await app.register(authRoutes, { prefix: "/api" })
await app.register(availabilityRoutes, { prefix: "/api" })
await app.register(catalogRoutes, { prefix: "/api" })
await app.register(dashboardRoutes, { prefix: "/api" })
await app.register(inventoryRoutes, { prefix: "/api" })
await app.register(notificationRoutes, { prefix: "/api" })
await app.register(pharmacySetupRoutes, { prefix: "/api" })
await app.register(prescriptionRoutes, { prefix: "/api" })
await app.register(sessionRoutes, { prefix: "/api" })

try {
  await app.listen({ port: env.PORT, host: "0.0.0.0" })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
