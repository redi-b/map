import type { userRole } from "../db/schema.js"

export type UserRole = (typeof userRole.enumValues)[number]

export const dashboardAccessByRole: Record<UserRole, string[]> = {
  patient: [
    "/dashboard",
    "/dashboard/find",
    "/dashboard/prescriptions",
    "/dashboard/adherence",
    "/dashboard/assistant",
  ],
  pharmacist: [
    "/dashboard",
    "/dashboard/pharmacy/setup",
    "/dashboard/pharmacy/inventory",
    "/dashboard/pharmacy/requests",
  ],
  admin: [
    "/dashboard",
    "/dashboard/pharmacy/verification",
    "/dashboard/admin/users",
    "/dashboard/admin/audit",
  ],
}

export const roleHomePath: Record<UserRole, string> = {
  patient: "/dashboard",
  pharmacist: "/dashboard",
  admin: "/dashboard",
}

export const accessAreasByRole: Record<UserRole, string[]> = {
  patient: ["dashboard", "find", "prescriptions", "adherence", "assistant"],
  pharmacist: ["dashboard", "pharmacy.setup", "pharmacy.inventory", "pharmacy.requests"],
  admin: ["dashboard", "pharmacy.verification", "admin.users", "admin.audit"],
}

export function canAccessDashboardPath(role: UserRole, pathname: string) {
  return dashboardAccessByRole[role].includes(pathname)
}
