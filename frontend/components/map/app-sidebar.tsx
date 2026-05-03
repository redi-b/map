"use client"

import {
  ActivityIcon,
  BellIcon,
  BotIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  PackageSearchIcon,
  PillIcon,
  SettingsIcon,
  ShieldCheckIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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

const patientItems = [
  { label: "Dashboard", icon: LayoutDashboardIcon, href: "/" },
  { label: "Find Medicine", icon: PackageSearchIcon, href: "/find" },
  { label: "Prescriptions", icon: ClipboardListIcon, href: "/prescriptions" },
  { label: "Adherence", icon: ActivityIcon, href: "/adherence" },
  { label: "AI Assistant", icon: BotIcon, href: "/assistant" },
]

const pharmacyItems = [
  { label: "Inventory", icon: PillIcon, href: "/pharmacy/inventory" },
  { label: "Requests", icon: BellIcon, href: "/pharmacy/requests", badge: "12" },
  { label: "Verification", icon: ShieldCheckIcon, href: "/pharmacy/verification" },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="MAP">
              <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <PillIcon />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">MAP</span>
                <span className="truncate text-xs text-sidebar-foreground/70">Addis Ababa</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Patient workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {patientItems.map((item) => (
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
        <SidebarGroup>
          <SidebarGroupLabel>Pharmacy desk</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {pharmacyItems.map((item) => (
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
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Support">
              <LifeBuoyIcon />
              <span>Support</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings">
              <SettingsIcon />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
