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
  { label: "Dashboard", icon: LayoutDashboardIcon, active: true },
  { label: "Find Medicine", icon: PackageSearchIcon },
  { label: "Prescriptions", icon: ClipboardListIcon },
  { label: "Adherence", icon: ActivityIcon },
  { label: "AI Assistant", icon: BotIcon },
]

const pharmacyItems = [
  { label: "Inventory", icon: PillIcon },
  { label: "Requests", icon: BellIcon, badge: "12" },
  { label: "Verification", icon: ShieldCheckIcon },
]

export function AppSidebar() {
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
                  <SidebarMenuButton isActive={item.active} tooltip={item.label}>
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
                  <SidebarMenuButton tooltip={item.label}>
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
