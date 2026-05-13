import { eq } from "drizzle-orm"
import { db } from "../db/client.js"
import { profiles } from "../db/schema.js"
import type { CreateProfileInput, UpdateProfileInput } from "../validators/profile.js"

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
    const [updated] = await updateProfile(existing.id, input)
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

export function updateProfile(profileId: string, input: UpdateProfileInput) {
  return db
    .update(profiles)
    .set({
      fullName: input.fullName,
      phone: input.phone || null,
    })
    .where(eq(profiles.id, profileId))
    .returning()
}
