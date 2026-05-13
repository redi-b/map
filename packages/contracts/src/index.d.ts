export const userRoles: readonly ["patient", "pharmacist", "admin"]
export type UserRole = (typeof userRoles)[number]

export const dashboardAccessByRole: Record<UserRole, string[]>
export const roleHomePath: Record<UserRole, string>
export const accessAreasByRole: Record<UserRole, string[]>
export const roleLabels: Record<UserRole, string>
export const accountLabels: Record<UserRole, string>

export function isUserRole(value: unknown): value is UserRole
export function canAccessDashboardPath(role: UserRole, pathname: string): boolean
export function getRoleHomePath(role?: UserRole | null): string
export function getRoleLabel(role?: UserRole | null): string
export function getAccountLabel(role?: UserRole | null): string
