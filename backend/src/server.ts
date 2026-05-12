import "dotenv/config"
import cors from "@fastify/cors"
import multipart from "@fastify/multipart"
import sensible from "@fastify/sensible"
import Fastify from "fastify"
import { adherenceRoutes } from "./routes/adherence.js"
import { assistantRoutes } from "./routes/assistant.js"
import { authRoutes } from "./routes/auth.js"
import { availabilityRoutes } from "./routes/availability.js"
import { catalogRoutes } from "./routes/catalog.js"
import { healthRoutes } from "./routes/health.js"
import { inventoryRoutes } from "./routes/inventory.js"
import { notificationRoutes } from "./routes/notification.js"
import { prescriptionRoutes } from "./routes/prescription.js"
import { sessionRoutes } from "./routes/session.js"
import { env } from "./lib/env.js"

const app = Fastify({
  logger: true,
})

await app.register(cors, {
  origin: env.FRONTEND_ORIGIN,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
})
await app.register(sensible)
await app.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
})
await app.register(healthRoutes)
await app.register(adherenceRoutes, { prefix: "/api" })
await app.register(assistantRoutes, { prefix: "/api" })
await app.register(authRoutes, { prefix: "/api" })
await app.register(availabilityRoutes, { prefix: "/api" })
await app.register(catalogRoutes, { prefix: "/api" })
await app.register(inventoryRoutes, { prefix: "/api" })
await app.register(notificationRoutes, { prefix: "/api" })
await app.register(prescriptionRoutes, { prefix: "/api" })
await app.register(sessionRoutes, { prefix: "/api" })

try {
  await app.listen({ port: env.PORT, host: "0.0.0.0" })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
