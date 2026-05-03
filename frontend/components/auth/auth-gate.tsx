"use client"

import { AlertTriangleIcon, Loader2Icon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser, type CurrentUser, type UserRole } from "@/lib/api"

const accessByRole: Record<UserRole, string[]> = {
  patient: [
    "/dashboard",
    "/dashboard/find",
    "/dashboard/prescriptions",
    "/dashboard/adherence",
    "/dashboard/assistant",
  ],
  pharmacist: [
    "/dashboard",
    "/dashboard/pharmacy/inventory",
    "/dashboard/pharmacy/requests",
  ],
  admin: [
    "/dashboard",
    "/dashboard/find",
    "/dashboard/prescriptions",
    "/dashboard/adherence",
    "/dashboard/assistant",
    "/dashboard/pharmacy/inventory",
    "/dashboard/pharmacy/requests",
    "/dashboard/pharmacy/verification",
  ],
}

function canAccess(role: UserRole, pathname: string) {
  return accessByRole[role].some((allowedPath) => pathname === allowedPath)
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true

    getCurrentUser()
      .then((currentUser) => {
        if (!active) return

        if (!currentUser) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`)
          return
        }

        if (!currentUser.profile) {
          router.replace("/onboarding")
          return
        }

        setUser(currentUser)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [pathname, router])

  const allowed = useMemo(() => {
    if (!user?.profile) return false
    return canAccess(user.profile.role, pathname)
  }, [pathname, user])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
          Loading workspace
        </div>
      </div>
    )
  }

  if (failed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Could not verify your session</CardTitle>
            <CardDescription>Check that the API is running, then refresh this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!user?.profile) {
    return null
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="size-5" />
              Workspace not available
            </CardTitle>
            <CardDescription>
              Your current role does not include access to this section.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.replace("/dashboard")}>Back to dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return children
}
