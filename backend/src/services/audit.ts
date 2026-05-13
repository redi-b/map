import { desc, eq } from "drizzle-orm"
import { db } from "../db/client.js"
import { auditLogs, profiles } from "../db/schema.js"

type AuditDetails = Record<string, unknown> | null | undefined

function stringifyDetails(details: AuditDetails) {
  if (!details || Object.keys(details).length === 0) return null

  return JSON.stringify(details)
}

export async function writeAuditLog(input: {
  actorProfileId: string | null
  action: string
  entityType: string
  entityId?: string | null
  details?: AuditDetails
}) {
  await db.insert(auditLogs).values({
    actorProfileId: input.actorProfileId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    details: stringifyDetails(input.details),
  })
}

export async function listAuditLogs(limit = 80) {
  const rows = await db
    .select({
      id: auditLogs.id,
      actorProfileId: auditLogs.actorProfileId,
      actorName: profiles.fullName,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(profiles, eq(auditLogs.actorProfileId, profiles.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)

  return rows.map((row) => ({
    ...row,
    details: row.details ? JSON.parse(row.details) as Record<string, unknown> : null,
    createdAt: row.createdAt.toISOString(),
  }))
}
