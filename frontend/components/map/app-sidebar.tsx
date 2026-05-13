"use client"

import {
  ActivityIcon,
  BellIcon,
  BotIcon,
  Building2Icon,
  ChevronsUpDownIcon,
  ClipboardListIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  PackageSearchIcon,
  ShieldCheckIcon,
  type LucideIcon,
  UsersIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { canAccessDashboardPath, getAccountLabel, getRoleLabel } from "@/lib/access"
import { authClient } from "@/lib/auth-client"
import type { CurrentUser, UserRole } from "@/lib/api"
import { ThemeSubmenu } from "./theme-switcher"

type SidebarNavItem = {
  label: string
  icon: LucideIcon
  href: string
  badge?: string
}

const overviewItems: SidebarNavItem[] = [
  { label: "Dashboard", icon: LayoutDashboardIcon, href: "/dashboard" },
]

const patientItems: SidebarNavItem[] = [
  { label: "Find Medicine", icon: PackageSearchIcon, href: "/dashboard/find" },
  { label: "Prescriptions", icon: ClipboardListIcon, href: "/dashboard/prescriptions" },
  { label: "Adherence", icon: ActivityIcon, href: "/dashboard/adherence" },
  { label: "Medication Guide", icon: BotIcon, href: "/dashboard/assistant" },
]

const pharmacyItems: SidebarNavItem[] = [
  { label: "Account setup", icon: Building2Icon, href: "/dashboard/pharmacy/setup" },
  { label: "Inventory", icon: PackageSearchIcon, href: "/dashboard/pharmacy/inventory" },
  { label: "Requests", icon: BellIcon, href: "/dashboard/pharmacy/requests" },
  { label: "Verification", icon: ShieldCheckIcon, href: "/dashboard/pharmacy/verification" },
  { label: "Users", icon: UsersIcon, href: "/dashboard/admin/users" },
  { label: "Audit", icon: HistoryIcon, href: "/dashboard/admin/audit" },
]

function getInitials(name?: string | null, email?: string) {
  const source = name?.trim() || email || "MAP"
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

function getVisibleItems<T extends { href: string }>(role: UserRole, items: T[]) {
  return items.filter((item) => canAccessDashboardPath(role, item.href))
}

export function AppSidebar({ currentUser }: { currentUser: CurrentUser }) {
  const pathname = usePathname()
  const router = useRouter()
  const profile = currentUser.profile
  const role = profile?.role ?? "patient"
  const overviewNavigation = getVisibleItems(role, overviewItems)
  const patientNavigation = getVisibleItems(role, patientItems)
  const pharmacyNavigation = getVisibleItems(role, pharmacyItems)
  const displayName = profile?.fullName || currentUser.session.user.name || currentUser.session.user.email
  const initials = getInitials(displayName, currentUser.session.user.email)

  async function signOut() {
    await authClient.signOut()
    router.replace("/login")
    router.refresh()
  }

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="MAP">
              <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <ShieldCheckIcon />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">MAP</span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {getRoleLabel(role)}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {overviewNavigation.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {patientNavigation.length ? (
          <SidebarGroup>
            <SidebarGroupLabel>Care tools</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {patientNavigation.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
        {pharmacyNavigation.length ? (
          <SidebarGroup>
            <SidebarGroupLabel>{role === "admin" ? "Operations" : "Pharmacy desk"}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {pharmacyNavigation.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton size="lg" tooltip="Account" />}>
                <Avatar className="size-8 rounded-md">
                  <AvatarFallback className="rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{displayName}</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    {currentUser.session.user.email}
                  </span>
                </div>
                <ChevronsUpDownIcon className="ml-auto" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="right" className="w-64">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <span className="block truncate font-medium text-foreground">{displayName}</span>
                    <span className="block truncate font-normal">{getAccountLabel(role)}</span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <ThemeSubmenu />
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={signOut} variant="destructive">
                    <LogOutIcon />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
