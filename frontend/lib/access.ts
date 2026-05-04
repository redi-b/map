import type { UserRole } from "./api"

export const roleHomePath: Record<UserRole, string> = {
  patient: "/dashboard",
  pharmacist: "/dashboard/pharmacy/inventory",
  admin: "/dashboard/pharmacy/verification",
}

export function getRoleHomePath(role?: UserRole | null) {
  return role ? roleHomePath[role] : "/dashboard"
}
