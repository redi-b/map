"use client"

import {
  Building2Icon,
  KeyRoundIcon,
  Loader2Icon,
  PlusIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  UserCogIcon,
  UserXIcon,
} from "lucide-react"
import { type FormEvent, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  createAdminUser,
  listAdminPharmacies,
  listAdminUsers,
  updateAdminUser,
  type AdminPharmacy,
  type AdminUser,
  type UserRole,
} from "@/lib/api"
import { toast } from "@/lib/toast"

const roleLabels: Record<UserRole, string> = {
  patient: "Patient",
  pharmacist: "Pharmacist",
  admin: "Operations",
}

const roleOptions: UserRole[] = ["patient", "pharmacist", "admin"]

type UserForm = {
  fullName: string
  email: string
  phone: string
  pharmacyId: string
}

type CreatedUserCredentials = {
  fullName: string
  email: string
  initialPassword: string
}

const emptyForm: UserForm = {
  fullName: "",
  email: "",
  phone: "",
  pharmacyId: "",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function pharmacyLabel(pharmacy: Pick<AdminPharmacy, "name" | "branchName">) {
  return [pharmacy.name, pharmacy.branchName].filter(Boolean).join(" - ")
}

function userPharmacyLabel(user: AdminUser) {
  if (!user.pharmacyName) return "Not assigned"
  return [user.pharmacyName, user.pharmacyBranchName].filter(Boolean).join(" - ")
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [pharmacies, setPharmacies] = useState<AdminPharmacy[]>([])
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [showCreate, setShowCreate] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<CreatedUserCredentials | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState("")
  const [error, setError] = useState("")

  const counts = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((user) => user.isActive).length,
      pharmacists: users.filter((user) => user.role === "pharmacist").length,
      setupRequired: users.filter((user) => user.mustChangePassword).length,
    }
  }, [users])

  async function loadData() {
    setLoading(true)
    setError("")

    try {
      const [userData, pharmacyData] = await Promise.all([listAdminUsers(), listAdminPharmacies()])
      setUsers(userData.users)
      setPharmacies(pharmacyData.pharmacies)
      setForm((current) => ({
        ...current,
        pharmacyId: current.pharmacyId || pharmacyData.pharmacies[0]?.id || "",
      }))
    } catch {
      setError("Unable to load account data.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [])

  function updateForm<K extends keyof UserForm>(key: K, value: UserForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")

    if (!form.pharmacyId) {
      setError("Choose a pharmacy before creating a pharmacist account.")
      setSaving(false)
      return
    }

    try {
      const result = await createAdminUser({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        role: "pharmacist",
        pharmacyId: form.pharmacyId,
      })

      setUsers((current) => [result.user, ...current])
      setCreatedCredentials({
        fullName: result.user.fullName,
        email: result.user.email,
        initialPassword: result.initialPassword,
      })
      setForm({ ...emptyForm, pharmacyId: pharmacies[0]?.id || "" })
      setShowCreate(false)
      toast.success("User created", "Share the temporary password before leaving this page.")
    } catch {
      setError("Unable to create user. Check the account details and try again.")
      toast.error("User not created", "Check the account details and try again.")
    } finally {
      setSaving(false)
    }
  }

  async function updateUser(user: AdminUser, input: { role?: UserRole; isActive?: boolean; pharmacyId?: string | null }) {
    setUpdatingId(user.id)
    setError("")

    try {
      const updated = await updateAdminUser(user.id, input)
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      toast.success("User updated", updated.fullName)
    } catch {
      setError("Unable to update this user.")
      toast.error("User not updated", "Try again in a moment.")
    } finally {
      setUpdatingId("")
    }
  }

  function changeRole(user: AdminUser, role: UserRole) {
    if (role === "pharmacist") {
      const pharmacyId = user.pharmacyId || pharmacies[0]?.id
      if (!pharmacyId) {
        setError("Create a pharmacy before assigning pharmacist access.")
        toast.warning("No pharmacy available", "Create a pharmacy before assigning pharmacist access.")
        return
      }
      void updateUser(user, { role, pharmacyId })
      return
    }

    void updateUser(user, { role, pharmacyId: null })
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
            <CardTitle>{counts.setupRequired}</CardTitle>
            <CardDescription>Setup required</CardDescription>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>User management</CardTitle>
            <CardDescription>Create accounts, assign pharmacy access, and manage availability.</CardDescription>
          </div>
          <Button onClick={() => setShowCreate((value) => !value)}>
            <PlusIcon data-icon="inline-start" />
            Add user
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {showCreate ? (
            <form onSubmit={handleCreate} className="grid gap-4 rounded-lg border bg-secondary/40 p-4">
              <div>
                <p className="font-medium">Create account</p>
                <p className="text-sm text-muted-foreground">
                  New users receive a temporary password and must set a private one on first login.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Input
                  placeholder="Full name"
                  value={form.fullName}
                  onChange={(event) => updateForm("fullName", event.target.value)}
                  required
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                  required
                />
                <Input
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(event) => updateForm("phone", event.target.value)}
                />
                <div className="flex h-10 items-center rounded-md border bg-background px-3 text-sm">
                  Pharmacy user
                </div>
              </div>
              <label className="grid gap-2 text-sm font-medium md:max-w-md">
                Pharmacy assignment
                <Select value={form.pharmacyId || "none"} onValueChange={(value) => updateForm("pharmacyId", !value || value === "none" ? "" : value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose pharmacy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">Choose pharmacy</SelectItem>
                      {pharmacies.map((pharmacy) => (
                        <SelectItem key={pharmacy.id} value={pharmacy.id}>
                          {pharmacyLabel(pharmacy)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon data-icon="inline-start" />}
                  Create user
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}

          {createdCredentials ? (
            <div className="grid gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
              <div>
                <p className="font-medium">Login created</p>
                <p className="text-muted-foreground">
                  Share these credentials with {createdCredentials.fullName}. The password must be changed at first login.
                </p>
              </div>
              <div className="grid gap-2 rounded-md bg-background p-3 sm:grid-cols-2">
                <span>
                  <span className="block text-xs text-muted-foreground">Email</span>
                  {createdCredentials.email}
                </span>
                <span>
                  <span className="block text-xs text-muted-foreground">Temporary password</span>
                  <code className="font-mono text-xs">{createdCredentials.initialPassword}</code>
                </span>
              </div>
            </div>
          ) : null}

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
                    <TableHead>Pharmacy</TableHead>
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
                          <Select
                            value={user.role}
                            disabled={updating || lockSelf}
                            onValueChange={(value) => changeRole(user, value as UserRole)}
                          >
                            <SelectTrigger size="sm" aria-label={`Change role for ${user.fullName}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {roleOptions.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {roleLabels[role]}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {user.role === "pharmacist" ? (
                            <div className="grid min-w-56 gap-2">
                              <Select
                                value={user.pharmacyId ?? "none"}
                                disabled={updating || lockSelf}
                                onValueChange={(value) => updateUser(user, { pharmacyId: !value || value === "none" ? null : value })}
                              >
                                <SelectTrigger size="sm" className="w-full" aria-label={`Assign pharmacy for ${user.fullName}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    <SelectItem value="none">Not assigned</SelectItem>
                                    {pharmacies.map((pharmacy) => (
                                      <SelectItem key={pharmacy.id} value={pharmacy.id}>
                                        {pharmacyLabel(pharmacy)}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Building2Icon className="size-3" />
                                {userPharmacyLabel(user)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">No pharmacy access</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={user.isActive ? "default" : "secondary"}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                            {user.mustChangePassword ? (
                              <Badge variant="outline">
                                <KeyRoundIcon className="mr-1 size-3" />
                                Setup required
                              </Badge>
                            ) : null}
                          </div>
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
