import { eq } from "drizzle-orm"
import { db } from "../db/client.js"
import { profiles } from "../db/schema.js"
import type { CreateProfileInput } from "../validators/profile.js"

export async function findProfileByAuthUserId(authUserId: string) {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.authUserId, authUserId))
    .limit(1)

  return profile ?? null
}

export async function createOrUpdateProfile(authUserId: string, input: CreateProfileInput) {
  const existing = await findProfileByAuthUserId(authUserId)

  if (existing) {
    const [updated] = await db
      .update(profiles)
      .set({
        fullName: input.fullName,
        phone: input.phone || null,
        role: input.role,
      })
      .where(eq(profiles.id, existing.id))
      .returning()

    return { profile: updated, created: false }
  }

  const [profile] = await db
    .insert(profiles)
    .values({
      authUserId,
      fullName: input.fullName,
      phone: input.phone || null,
      role: input.role,
    })
    .returning()

  return { profile, created: true }
}
