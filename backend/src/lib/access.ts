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
    "/dashboard/pharmacy/inventory",
    "/dashboard/pharmacy/requests",
  ],
  admin: [
    "/dashboard",
    "/dashboard/pharmacy/verification",
    "/dashboard/pharmacy/requests",
  ],
}

export const roleHomePath: Record<UserRole, string> = {
  patient: "/dashboard",
  pharmacist: "/dashboard/pharmacy/inventory",
  admin: "/dashboard/pharmacy/verification",
}

export const accessAreasByRole: Record<UserRole, string[]> = {
  patient: ["dashboard", "find", "prescriptions", "adherence", "assistant"],
  pharmacist: ["dashboard", "pharmacy.inventory", "pharmacy.requests"],
  admin: ["dashboard", "pharmacy.verification", "pharmacy.requests"],
}

export function canAccessDashboardPath(role: UserRole, pathname: string) {
  return dashboardAccessByRole[role].includes(pathname)
}
