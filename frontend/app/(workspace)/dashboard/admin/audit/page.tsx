"use client"

import { HistoryIcon, Loader2Icon, ShieldCheckIcon, UserCogIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { listAuditLogs, type AuditLog } from "@/lib/api"

const actionLabels: Record<string, string> = {
  "pharmacy.create": "Pharmacy registered",
  "pharmacy.verify": "Pharmacy verified",
  "pharmacy.unverify": "Verification removed",
  "user.create": "User created",
  "user.update": "User updated",
  "prescription.review": "Prescription reviewed",
  "availability_request.respond": "Request response sent",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function entityLabel(log: AuditLog) {
  if (log.entityType === "availability_request") return "Request"
  return log.entityType.charAt(0).toUpperCase() + log.entityType.slice(1)
}

function summarizeDetails(details: AuditLog["details"]) {
  if (!details) return "No extra details"

  const hiddenKeys = new Set(["pharmacyId", "primaryUserId", "alternativeMedicineId"])
  const parts = Object.entries(details)
    .filter(([key, value]) => !hiddenKeys.has(key) && value !== undefined && value !== null && value !== "")
    .slice(0, 4)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, " $1").toLowerCase()}: ${String(value)}`)

  return parts.length ? parts.join(" · ") : "No extra details"
}

function targetLabel(log: AuditLog) {
  const details = log.details ?? {}
  const label =
    typeof details.pharmacyName === "string" ? details.pharmacyName :
    typeof details.targetEmail === "string" ? details.targetEmail :
    typeof details.primaryUserEmail === "string" ? details.primaryUserEmail :
    typeof details.action === "string" ? details.action :
    null

  return label ?? (log.entityId ? `${entityLabel(log)} ${log.entityId.slice(0, 8)}` : entityLabel(log))
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const summary = useMemo(() => {
    return {
      total: logs.length,
      admin: logs.filter((log) => log.action.startsWith("user.") || log.action.startsWith("pharmacy.")).length,
      clinical: logs.filter((log) => log.action.includes("prescription") || log.action.includes("availability")).length,
    }
  }, [logs])

  useEffect(() => {
    let active = true

    listAuditLogs()
      .then((data) => {
        if (active) setLogs(data.logs)
      })
      .catch(() => {
        if (active) setError("Unable to load audit history.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{summary.total}</CardTitle>
            <CardDescription>Recent events</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{summary.admin}</CardTitle>
            <CardDescription>Operations changes</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{summary.clinical}</CardTitle>
            <CardDescription>Patient workflow events</CardDescription>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Audit trail</CardTitle>
            <CardDescription>Recent account, pharmacy, prescription, and request actions.</CardDescription>
          </div>
          <div className="flex size-10 items-center justify-center rounded-full bg-secondary">
            <HistoryIcon className="size-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

          {loading ? (
            <div className="flex items-center gap-3 rounded-lg border p-4 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading audit history
            </div>
          ) : null}

          {!loading && logs.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No audit events have been recorded yet.
            </div>
          ) : null}

          {!loading && logs.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex min-w-52 items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                            {log.action.startsWith("user.") || log.action.startsWith("pharmacy.") ? (
                              <ShieldCheckIcon className="size-4 text-muted-foreground" />
                            ) : (
                              <UserCogIcon className="size-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{actionLabels[log.action] ?? log.action}</p>
                            <p className="text-xs text-muted-foreground">{log.action}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{log.actorName ?? "System"}</TableCell>
                      <TableCell>
                        <div className="grid gap-1">
                          <Badge variant="secondary" className="w-fit">
                            {entityLabel(log)}
                          </Badge>
                          <span className="max-w-56 truncate text-xs text-muted-foreground">{targetLabel(log)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md text-sm text-muted-foreground">
                        {summarizeDetails(log.details)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatDate(log.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
