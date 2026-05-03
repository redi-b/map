import { AppSidebar } from "@/components/map/app-sidebar"
import { WorkspaceHeader } from "@/components/map/workspace-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-background">
          <WorkspaceHeader />
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
