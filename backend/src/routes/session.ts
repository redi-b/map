import { fromNodeHeaders } from "better-auth/node"
import { eq } from "drizzle-orm"
import type { FastifyPluginAsync } from "fastify"
import { db } from "../db/client.js"
import { profiles, userRole } from "../db/schema.js"
import { auth } from "../lib/auth.js"

const profileBodySchema = {
  type: "object",
  required: ["fullName", "role"],
  properties: {
    fullName: { type: "string", minLength: 2 },
    phone: { type: "string" },
    role: { type: "string", enum: userRole.enumValues },
  },
} as const

export const sessionRoutes: FastifyPluginAsync = async (app) => {
  app.get("/me", async (request, reply) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    })

    if (!session) {
      return reply.status(401).send({ error: "Unauthorized" })
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.authUserId, session.user.id))
      .limit(1)

    return {
      session,
      profile: profile ?? null,
    }
  })

  app.post<{ Body: { fullName: string; phone?: string; role: "patient" | "pharmacist" | "admin" } }>(
    "/profile",
    { schema: { body: profileBodySchema } },
    async (request, reply) => {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      })

      if (!session) {
        return reply.status(401).send({ error: "Unauthorized" })
      }

      const [existingProfile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.authUserId, session.user.id))
        .limit(1)

      if (existingProfile) {
        const [updatedProfile] = await db
          .update(profiles)
          .set({
            fullName: request.body.fullName,
            phone: request.body.phone,
            role: request.body.role,
          })
          .where(eq(profiles.id, existingProfile.id))
          .returning()

        return updatedProfile
      }

      const [profile] = await db
        .insert(profiles)
        .values({
          authUserId: session.user.id,
          fullName: request.body.fullName,
          phone: request.body.phone,
          role: request.body.role,
        })
        .returning()

      return reply.status(201).send(profile)
    }
  )

  app.get("/access", async (request, reply) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    })

    if (!session) {
      return reply.status(401).send({ error: "Unauthorized" })
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.authUserId, session.user.id))
      .limit(1)

    if (!profile) {
      return {
        role: null,
        areas: [],
      }
    }

    const areasByRole = {
      patient: ["dashboard", "find", "prescriptions", "adherence", "assistant"],
      pharmacist: ["dashboard", "pharmacy.inventory", "pharmacy.requests"],
      admin: ["dashboard", "find", "prescriptions", "adherence", "assistant", "pharmacy.inventory", "pharmacy.requests", "pharmacy.verification"],
    } as const

    return {
      role: profile.role,
      areas: areasByRole[profile.role],
    }
  })
}
