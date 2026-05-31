import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify"
import { fromNodeHeaders } from "better-auth/node"
import { auth } from "../lib/auth.js"
import { requireProfile } from "../lib/auth-context.js"
import {
  getPharmacySetupState,
  markPasswordSetupComplete,
  updateAssignedPharmacyLocation,
} from "../services/pharmacy-setup.js"
import { completePasswordSetupSchema, updatePharmacyLocationSchema } from "../validators/pharmacy.js"

export const pharmacySetupRoutes: FastifyPluginAsync = async (app) => {
  async function handlePasswordChange(request: FastifyRequest, reply: FastifyReply) {
    const context = await requireProfile(request, reply, ["patient", "pharmacist", "admin"])
    if (!context) return

    const parsed = completePasswordSetupSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid data", details: parsed.error.flatten().fieldErrors })
    }

    try {
      await auth.api.changePassword({
        headers: fromNodeHeaders(request.headers),
        body: {
          currentPassword: parsed.data.currentPassword,
          newPassword: parsed.data.newPassword,
          revokeOtherSessions: false,
        },
      })
    } catch {
      return reply.status(400).send({ error: "Unable to change password" })
    }

    return markPasswordSetupComplete(context.profile.id)
  }

  app.get("/pharmacy/setup", async (request, reply) => {
    const context = await requireProfile(request, reply, ["pharmacist"])
    if (!context) return

    return getPharmacySetupState(context.profile.id)
  })

  app.patch("/pharmacy/setup/location", async (request, reply) => {
    const context = await requireProfile(request, reply, ["pharmacist"])
    if (!context) return

    const parsed = updatePharmacyLocationSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid data", details: parsed.error.flatten().fieldErrors })
    }

    const state = await updateAssignedPharmacyLocation(context.profile.id, parsed.data)
    if (!state) {
      return reply.status(404).send({ error: "No pharmacy assigned" })
    }

    return state
  })

  app.post("/pharmacy/setup/password", handlePasswordChange)
  app.post("/account/password", handlePasswordChange)
}
