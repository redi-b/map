"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { buttonVariants } from "@/components/ui/button"
import { getRoleHomePath } from "@/lib/access"
import { getCurrentUser } from "@/lib/api"
import { cn } from "@/lib/utils"

type AuthActionState =
  | { status: "checking" }
  | { status: "guest" }
  | { status: "authenticated"; href: string }

export function LandingAuthActions({ placement = "nav" }: { placement?: "nav" | "section" }) {
  const [authState, setAuthState] = useState<AuthActionState>({ status: "checking" })

  useEffect(() => {
    let active = true

    getCurrentUser()
      .then((currentUser) => {
        if (!active) return

        if (!currentUser) {
          setAuthState({ status: "guest" })
          return
        }

        setAuthState({
          status: "authenticated",
          href: currentUser.profile ? getRoleHomePath(currentUser.profile.role) : "/onboarding",
        })
      })
      .catch(() => {
        if (active) setAuthState({ status: "guest" })
      })

    return () => {
      active = false
    }
  }, [])

  if (authState.status === "checking") {
    return <div className={placement === "nav" ? "h-8 w-32" : "h-9 w-40"} />
  }

  if (authState.status === "authenticated") {
    return (
      <Link className={buttonVariants()} href={authState.href}>
        Go to dashboard
      </Link>
    )
  }

  if (placement === "section") {
    return (
      <>
        <Link className={buttonVariants()} href="/register">
          Create patient account
        </Link>
        <Link className={cn(buttonVariants({ variant: "outline" }), "bg-card")} href="/login">
          Sign in
        </Link>
      </>
    )
  }

  return (
    <>
      <Link className={cn(buttonVariants({ variant: "ghost" }), "hidden sm:inline-flex")} href="/login">
        Sign in
      </Link>
      <Link className={buttonVariants()} href="/register">
        Patient signup
      </Link>
    </>
  )
}
