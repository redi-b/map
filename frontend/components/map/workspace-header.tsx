"use client"

import { usePathname } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { getRoleLabel } from "@/lib/access"
import type { CurrentUser } from "@/lib/api"
import { ThemeSwitcher } from "./theme-switcher"

const routeLabels: Record<string, { eyebrow: string; title: string }> = {
  "/dashboard": { eyebrow: "Bole, Addis Ababa", title: "Care dashboard" },
  "/dashboard/find": { eyebrow: "Live pharmacy stock", title: "Find medicine" },
  "/dashboard/prescriptions": { eyebrow: "Verification trail", title: "Prescriptions" },
  "/dashboard/adherence": { eyebrow: "Dose schedule", title: "Adherence" },
  "/dashboard/assistant": { eyebrow: "Medication guidance", title: "Medication guide" },
  "/dashboard/pharmacy/inventory": { eyebrow: "Branch operations", title: "Inventory" },
  "/dashboard/pharmacy/requests": { eyebrow: "Pharmacy desk", title: "Requests" },
  "/dashboard/pharmacy/verification": { eyebrow: "Operations review", title: "Verification" },
}

function getInitials(name?: string | null, email?: string) {
  const source = name?.trim() || email || "MAP"
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

export function WorkspaceHeader({ currentUser }: { currentUser: CurrentUser }) {
  const pathname = usePathname()
  const labels = routeLabels[pathname] ?? routeLabels["/dashboard"]
  const profile = currentUser.profile
  const displayName = profile?.fullName || currentUser.session.user.name || currentUser.session.user.email
  const initials = getInitials(displayName, currentUser.session.user.email)

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground">{labels.eyebrow}</p>
            <h1 className="truncate font-[var(--font-display)] text-xl font-semibold">
              {labels.title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <div className="hidden min-w-0 flex-col items-end md:flex">
            <span className="max-w-44 truncate text-sm font-medium">{displayName}</span>
            <span className="text-xs text-muted-foreground">
              {getRoleLabel(profile?.role)}
            </span>
          </div>
          <Avatar className="size-9 rounded-md">
            <AvatarFallback className="rounded-md">{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
