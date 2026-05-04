"use client"

import { AuthGate } from "@/components/auth/auth-gate"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import type { CurrentUser } from "@/lib/api"
import { AppSidebar } from "./app-sidebar"
import { WorkspaceHeader } from "./workspace-header"

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      {(currentUser: CurrentUser) => (
        <SidebarProvider>
          <AppSidebar currentUser={currentUser} />
          <SidebarInset>
            <div className="min-h-screen bg-background">
              <WorkspaceHeader currentUser={currentUser} />
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      )}
    </AuthGate>
  )
}
