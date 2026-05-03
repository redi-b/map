"use client"

import { usePathname } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeSwitcher } from "./theme-switcher"

const routeLabels: Record<string, { eyebrow: string; title: string }> = {
  "/dashboard": { eyebrow: "Bole, Addis Ababa", title: "Patient dashboard" },
  "/dashboard/find": { eyebrow: "Live pharmacy stock", title: "Find medicine" },
  "/dashboard/prescriptions": { eyebrow: "Verification trail", title: "Prescriptions" },
  "/dashboard/adherence": { eyebrow: "Dose schedule", title: "Adherence" },
  "/dashboard/assistant": { eyebrow: "Medication guidance", title: "AI health assistant" },
  "/dashboard/pharmacy/inventory": { eyebrow: "Branch operations", title: "Inventory" },
  "/dashboard/pharmacy/requests": { eyebrow: "Pharmacy desk", title: "Requests" },
  "/dashboard/pharmacy/verification": { eyebrow: "Admin controls", title: "Verification" },
}

export function WorkspaceHeader() {
  const pathname = usePathname()
  const labels = routeLabels[pathname] ?? routeLabels["/dashboard"]

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground">{labels.eyebrow}</p>
            <h1 className="truncate font-[var(--font-display)] text-xl font-semibold">
              {labels.title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <Avatar>
            <AvatarFallback>AK</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
