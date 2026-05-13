import type { FastifyPluginAsync } from "fastify"
import { accessAreasByRole, dashboardAccessByRole, roleHomePath } from "../lib/access.js"
import { getCurrentProfile, getSession, requireProfile } from "../lib/auth-context.js"
import { createOrUpdateProfile, updateProfile } from "../services/profile.js"
import { createProfileSchema, updateProfileSchema } from "../validators/profile.js"

export const sessionRoutes: FastifyPluginAsync = async (app) => {
  app.get("/me", async (request, reply) => {
    const session = await getSession(request)

    if (!session) {
      return reply.status(401).send({ error: "Unauthorized" })
    }

    const profile = await getCurrentProfile(session.user.id)

    return {
      session,
      profile: profile ?? null,
    }
  })

  app.post("/profile", async (request, reply) => {
    const session = await getSession(request)

    if (!session) {
      return reply.status(401).send({ error: "Unauthorized" })
    }

    const existingProfile = await getCurrentProfile(session.user.id)

    if (existingProfile) {
      const parsed = updateProfileSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Invalid profile data",
          details: parsed.error.flatten().fieldErrors,
        })
      }

      const [profile] = await updateProfile(existingProfile.id, parsed.data)
      return reply.status(200).send(profile)
    }

    const parsed = createProfileSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid profile data",
        details: parsed.error.flatten().fieldErrors,
      })
    }

    const { profile, created } = await createOrUpdateProfile(session.user.id, parsed.data)

    return reply.status(created ? 201 : 200).send(profile)
  })

  app.get("/access", async (request, reply) => {
    const context = await requireProfile(request, reply)

    if (!context) {
      return
    }

    return {
      role: context.profile.role,
      areas: accessAreasByRole[context.profile.role],
      dashboardPaths: dashboardAccessByRole[context.profile.role],
      homePath: roleHomePath[context.profile.role],
    }
  })
}
