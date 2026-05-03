import { fromNodeHeaders } from "better-auth/node"
import type { FastifyPluginAsync } from "fastify"
import { auth } from "../lib/auth.js"

export const sessionRoutes: FastifyPluginAsync = async (app) => {
  app.get("/me", async (request, reply) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    })

    if (!session) {
      return reply.status(401).send({ error: "Unauthorized" })
    }

    return session
  })
}
