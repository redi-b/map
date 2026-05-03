import "dotenv/config"
import cors from "@fastify/cors"
import sensible from "@fastify/sensible"
import Fastify from "fastify"
import { catalogRoutes } from "./routes/catalog.js"
import { healthRoutes } from "./routes/health.js"
import { env } from "./lib/env.js"

const app = Fastify({
  logger: true,
})

await app.register(cors, {
  origin: env.FRONTEND_ORIGIN,
  credentials: true,
})
await app.register(sensible)
await app.register(healthRoutes)
await app.register(catalogRoutes, { prefix: "/api" })

try {
  await app.listen({ port: env.PORT, host: "0.0.0.0" })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
