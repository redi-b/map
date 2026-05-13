import type { FastifyPluginAsync } from "fastify"
import { requireProfile } from "../lib/auth-context.js"
import {
  createAdminPharmacy,
  createAdminUser,
  listAdminUsers,
  listAdminPharmacies,
  updateAdminUser,
  verifyAdminPharmacy,
} from "../services/admin.js"
import {
  createAdminPharmacySchema,
  createAdminUserSchema,
  updateAdminUserSchema,
  verifyAdminPharmacySchema,
} from "../validators/admin.js"

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get("/admin/pharmacies", async (request, reply) => {
    const context = await requireProfile(request, reply, ["admin"])
    if (!context) return

    return { pharmacies: await listAdminPharmacies() }
  })

  app.post("/admin/pharmacies", async (request, reply) => {
    const context = await requireProfile(request, reply, ["admin"])
    if (!context) return

    const parsed = createAdminPharmacySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid data", details: parsed.error.flatten().fieldErrors })
    }

    try {
      return reply.status(201).send(await createAdminPharmacy(parsed.data))
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "Unable to register pharmacy" })
    }
  })

  app.patch("/admin/pharmacies/:id/verify", async (request, reply) => {
    const context = await requireProfile(request, reply, ["admin"])
    if (!context) return

    const { id } = request.params as { id: string }
    const parsed = verifyAdminPharmacySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid data", details: parsed.error.flatten().fieldErrors })
    }

    const pharmacy = await verifyAdminPharmacy(id, parsed.data)
    if (!pharmacy) {
      return reply.status(404).send({ error: "Pharmacy not found" })
    }

    return pharmacy
  })

  app.get("/admin/users", async (request, reply) => {
    const context = await requireProfile(request, reply, ["admin"])
    if (!context) return

    const users = await listAdminUsers()
    return {
      users: users.map((user) => ({
        ...user,
        isCurrentUser: user.id === context.profile.id,
      })),
    }
  })

  app.patch("/admin/users/:id", async (request, reply) => {
    const context = await requireProfile(request, reply, ["admin"])
    if (!context) return

    const { id } = request.params as { id: string }
    const parsed = updateAdminUserSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid data", details: parsed.error.flatten().fieldErrors })
    }

    if (id === context.profile.id && parsed.data.isActive === false) {
      return reply.status(400).send({ error: "You cannot deactivate your own account" })
    }

    if (id === context.profile.id && parsed.data.role && parsed.data.role !== context.profile.role) {
      return reply.status(400).send({ error: "You cannot change your own role" })
    }

    let user
    try {
      user = await updateAdminUser(id, parsed.data)
      if (!user) {
        return reply.status(404).send({ error: "User not found" })
      }
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "Unable to update user" })
    }

    return {
      ...user,
      isCurrentUser: user.id === context.profile.id,
    }
  })

  app.post("/admin/users", async (request, reply) => {
    const context = await requireProfile(request, reply, ["admin"])
    if (!context) return

    const parsed = createAdminUserSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid data", details: parsed.error.flatten().fieldErrors })
    }

    try {
      const result = await createAdminUser(parsed.data)
      return reply.status(201).send({
        ...result,
        user: {
          ...result.user,
          isCurrentUser: result.user.id === context.profile.id,
        },
      })
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "Unable to create user" })
    }
  })
}
