import { fromNodeHeaders } from "better-auth/node"
import type { FastifyPluginAsync } from "fastify"
import { auth } from "../lib/auth.js"

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.route({
    method: ["GET", "POST"],
    url: "/auth/*",
    async handler(request, reply) {
      try {
        const url = new URL(request.url, `http://${request.headers.host}`)
        const body =
          request.body === undefined ? undefined : JSON.stringify(request.body)
        const response = await auth.handler(
          new Request(url.toString(), {
            method: request.method,
            headers: fromNodeHeaders(request.headers),
            body,
          })
        )

        reply.status(response.status)
        response.headers.forEach((value, key) => reply.header(key, value))
        reply.send(response.body ? await response.text() : null)
      } catch (error) {
        request.log.error(error)
        reply.status(500).send({
          error: "Internal authentication error",
          code: "AUTH_FAILURE",
        })
      }
    },
  })
}
