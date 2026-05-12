import type { FastifyPluginAsync } from "fastify"
import { requireProfile } from "../lib/auth-context.js"
import { getDashboardSummary } from "../services/dashboard.js"

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  /** GET /dashboard/summary — role-specific dashboard metrics and lists. */
  app.get("/dashboard/summary", async (request, reply) => {
    const context = await requireProfile(request, reply)
    if (!context) return

    return getDashboardSummary(context.profile)
  })
}
