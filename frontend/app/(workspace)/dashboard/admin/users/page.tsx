"use client"

import {
  Loader2Icon,
  ShieldCheckIcon,
  UserCheckIcon,
  UserCogIcon,
  UserXIcon,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { listAdminUsers, updateAdminUser, type AdminUser, type UserRole } from "@/lib/api"

const roleLabels: Record<UserRole, string> = {
  patient: "Patient",
  pharmacist: "Pharmacist",
  admin: "Operations",
}

const roleOptions: UserRole[] = ["patient", "pharmacist", "admin"]

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState("")
  const [error, setError] = useState("")

  const counts = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((user) => user.isActive).length,
      pharmacists: users.filter((user) => user.role === "pharmacist").length,
      admins: users.filter((user) => user.role === "admin").length,
    }
  }, [users])

  async function loadUsers() {
    setLoading(true)
    setError("")

    try {
      const data = await listAdminUsers()
      setUsers(data.users)
    } catch {
      setError("Unable to load users.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadUsers()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [])

  async function updateUser(user: AdminUser, input: { role?: UserRole; isActive?: boolean }) {
    setUpdatingId(user.id)
    setError("")

    try {
      const updated = await updateAdminUser(user.id, input)
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } catch {
      setError("Unable to update this user.")
    } finally {
      setUpdatingId("")
    }
  }

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>{counts.total}</CardTitle>
            <CardDescription>Total users</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{counts.active}</CardTitle>
            <CardDescription>Active accounts</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{counts.pharmacists}</CardTitle>
            <CardDescription>Pharmacy users</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{counts.admins}</CardTitle>
            <CardDescription>Operations users</CardDescription>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>User management</CardTitle>
            <CardDescription>Review roles and account access for the workspace.</CardDescription>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-3 rounded-lg border p-4 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading users
            </div>
          ) : null}

          {!loading && users.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No user profiles have been created yet.
            </div>
          ) : null}

          {!loading && users.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const updating = updatingId === user.id
                    const lockSelf = user.isCurrentUser

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex min-w-56 items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                              {user.role === "admin" ? (
                                <ShieldCheckIcon className="size-4 text-muted-foreground" />
                              ) : user.role === "pharmacist" ? (
                                <UserCogIcon className="size-4 text-muted-foreground" />
                              ) : (
                                <UserCheckIcon className="size-4 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{user.fullName}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <select
                            className="h-9 rounded-md border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                            value={user.role}
                            disabled={updating || lockSelf}
                            onChange={(event) => updateUser(user, { role: event.target.value as UserRole })}
                            aria-label={`Change role for ${user.fullName}`}
                          >
                            {roleOptions.map((role) => (
                              <option key={role} value={role}>
                                {roleLabels[role]}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updating || lockSelf}
                            onClick={() => updateUser(user, { isActive: !user.isActive })}
                          >
                            {updating ? (
                              <Loader2Icon className="size-4 animate-spin" />
                            ) : user.isActive ? (
                              <UserXIcon data-icon="inline-start" />
                            ) : (
                              <UserCheckIcon data-icon="inline-start" />
                            )}
                            {user.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
