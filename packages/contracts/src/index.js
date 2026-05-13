export const userRoles = ["patient", "pharmacist", "admin"]

export const dashboardAccessByRole = {
  patient: [
    "/dashboard",
    "/dashboard/find",
    "/dashboard/prescriptions",
    "/dashboard/adherence",
    "/dashboard/assistant",
    "/dashboard/settings",
  ],
  pharmacist: [
    "/dashboard",
    "/dashboard/pharmacy/setup",
    "/dashboard/pharmacy/inventory",
    "/dashboard/pharmacy/requests",
    "/dashboard/settings",
  ],
  admin: [
    "/dashboard",
    "/dashboard/pharmacy/verification",
    "/dashboard/admin/users",
    "/dashboard/admin/audit",
    "/dashboard/settings",
  ],
}

export const roleHomePath = {
  patient: "/dashboard",
  pharmacist: "/dashboard",
  admin: "/dashboard",
}

export const accessAreasByRole = {
  patient: ["dashboard", "find", "prescriptions", "adherence", "assistant", "settings"],
  pharmacist: ["dashboard", "pharmacy.setup", "pharmacy.inventory", "pharmacy.requests", "settings"],
  admin: ["dashboard", "pharmacy.verification", "admin.users", "admin.audit", "settings"],
}

export const roleLabels = {
  patient: "Patient dashboard",
  pharmacist: "Pharmacy dashboard",
  admin: "Operations dashboard",
}

export const accountLabels = {
  patient: "Patient account",
  pharmacist: "Pharmacy account",
  admin: "Operations account",
}

export function isUserRole(value) {
  return typeof value === "string" && userRoles.includes(value)
}

export function canAccessDashboardPath(role, pathname) {
  return dashboardAccessByRole[role].some((allowedPath) => pathname === allowedPath)
}

export function getRoleHomePath(role) {
  return role ? roleHomePath[role] : "/dashboard"
}

export function getRoleLabel(role) {
  return role ? roleLabels[role] : roleLabels.patient
}

export function getAccountLabel(role) {
  return role ? accountLabels[role] : accountLabels.patient
}
