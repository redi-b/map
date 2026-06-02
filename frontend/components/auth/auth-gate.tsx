"use client"

import { AlertTriangleIcon, Loader2Icon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { canAccessDashboardPath, getRoleHomePath } from "@/lib/access"
import { getCurrentUser, type CurrentUser } from "@/lib/api"

type AuthGateProps = {
  children: React.ReactNode | ((currentUser: CurrentUser) => React.ReactNode)
}

export function AuthGate({ children }: AuthGateProps) {
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

        if (
          currentUser.profile.mustChangePassword &&
          currentUser.profile.role === "pharmacist" &&
          pathname !== "/dashboard/pharmacy/setup"
        ) {
          router.replace("/dashboard/pharmacy/setup")
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
    return canAccessDashboardPath(user.profile.role, pathname)
  }, [pathname, user])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
          Loading dashboard
        </div>
      </div>
    )
  }

  if (failed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Could not verify your session</CardTitle>
            <CardDescription>The dashboard could not reach the API session check. Confirm the backend is running and using the migrated database, then refresh.</CardDescription>
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
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="size-5" />
              This area is not part of your workspace
            </CardTitle>
            <CardDescription>
              We will take you back to the tools set up for your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.replace(getRoleHomePath(user.profile?.role))}>
              Go to my workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return typeof children === "function" ? children(user) : children
}
