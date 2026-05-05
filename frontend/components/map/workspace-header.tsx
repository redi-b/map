"use client"

import { BellIcon, SearchIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { buttonVariants } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { canAccessDashboardPath } from "@/lib/access"
import type { CurrentUser } from "@/lib/api"
import { cn } from "@/lib/utils"

const routeLabels: Record<string, { eyebrow: string; title: string }> = {
  "/dashboard": { eyebrow: "Bole, Addis Ababa", title: "Dashboard" },
  "/dashboard/find": { eyebrow: "Live pharmacy stock", title: "Find medicine" },
  "/dashboard/prescriptions": { eyebrow: "Verification trail", title: "Prescriptions" },
  "/dashboard/adherence": { eyebrow: "Dose schedule", title: "Adherence" },
  "/dashboard/assistant": { eyebrow: "Medication guidance", title: "Medication guide" },
  "/dashboard/pharmacy/inventory": { eyebrow: "Branch operations", title: "Inventory" },
  "/dashboard/pharmacy/requests": { eyebrow: "Pharmacy desk", title: "Requests" },
  "/dashboard/pharmacy/verification": { eyebrow: "Operations review", title: "Verification" },
}

export function WorkspaceHeader({ currentUser }: { currentUser: CurrentUser }) {
  const pathname = usePathname()
  const labels = routeLabels[pathname] ?? routeLabels["/dashboard"]
  const role = currentUser.profile?.role ?? "patient"
  const searchHref = canAccessDashboardPath(role, "/dashboard/find")
    ? "/dashboard/find"
    : "/dashboard/pharmacy/inventory"
  const notificationHref = canAccessDashboardPath(role, "/dashboard/pharmacy/requests")
    ? "/dashboard/pharmacy/requests"
    : "/dashboard/adherence"

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <SidebarTrigger className="shrink-0" />
          <div className="min-w-0 border-l pl-4">
            <p className="truncate text-sm text-muted-foreground">{labels.eyebrow}</p>
            <h1 className="truncate font-[var(--font-display)] text-xl font-semibold">
              {labels.title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "rounded-full")}
            href={searchHref}
            aria-label="Search"
          >
            <SearchIcon />
          </Link>
          <Link
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "rounded-full")}
            href={notificationHref}
            aria-label="Open reminders"
          >
            <BellIcon />
          </Link>
        </div>
      </div>
    </header>
  )
}
