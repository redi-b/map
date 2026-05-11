import type { UserRole } from "./api"

export const userRoles = ["patient", "pharmacist", "admin"] as const

export const accessByRole: Record<UserRole, string[]> = {
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
  ],
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && userRoles.includes(value as UserRole)
}

export const roleHomePath: Record<UserRole, string> = {
  patient: "/dashboard",
  pharmacist: "/dashboard/pharmacy/inventory",
  admin: "/dashboard/pharmacy/verification",
}

export function getRoleHomePath(role?: UserRole | null) {
  return role ? roleHomePath[role] : "/dashboard"
}

export function canAccessDashboardPath(role: UserRole, pathname: string) {
  return accessByRole[role].some((allowedPath) => pathname === allowedPath)
}

export function getRoleLabel(role?: UserRole | null) {
  if (role === "pharmacist") return "Pharmacy dashboard"
  if (role === "admin") return "Operations dashboard"
  return "Patient dashboard"
}

export function getAccountLabel(role?: UserRole | null) {
  if (role === "pharmacist") return "Pharmacy account"
  if (role === "admin") return "Operations account"
  return "Patient account"
}
