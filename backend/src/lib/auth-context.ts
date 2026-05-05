import { fromNodeHeaders } from "better-auth/node"
import { eq } from "drizzle-orm"
import type { FastifyReply, FastifyRequest } from "fastify"
import { db } from "../db/client.js"
import { profiles } from "../db/schema.js"
import { auth } from "./auth.js"
import type { UserRole } from "./access.js"

export type CurrentProfile = typeof profiles.$inferSelect

export type AuthContext = {
  session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>
  profile: CurrentProfile
}

export async function getSession(request: FastifyRequest) {
  return auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  })
}

export async function getCurrentProfile(authUserId: string) {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.authUserId, authUserId))
    .limit(1)

  return profile ?? null
}

export async function requireProfile(
  request: FastifyRequest,
  reply: FastifyReply,
  allowedRoles?: readonly UserRole[]
): Promise<AuthContext | null> {
  const session = await getSession(request)

  if (!session) {
    reply.status(401).send({ error: "Unauthorized" })
    return null
  }

  const profile = await getCurrentProfile(session.user.id)

  if (!profile) {
    reply.status(403).send({ error: "Profile required" })
    return null
  }

  if (!profile.isActive) {
    reply.status(403).send({ error: "Profile inactive" })
    return null
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    reply.status(403).send({ error: "Forbidden" })
    return null
  }

  return { session, profile }
}
