import { NextResponse, type NextRequest } from "next/server"
import { canAccessDashboardPath, getRoleHomePath, isUserRole } from "./lib/access"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export async function proxy(request: NextRequest) {
  const sessionResponse = await fetch(`${apiBaseUrl}/api/me`, {
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  }).catch(() => null)

  if (!sessionResponse?.ok) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  const currentUser = await sessionResponse.json()

  if (!currentUser.profile) {
    return NextResponse.redirect(new URL("/onboarding", request.url))
  }

  const role = currentUser.profile.role

  if (!isUserRole(role)) {
    return NextResponse.redirect(new URL("/onboarding", request.url))
  }

  if (!canAccessDashboardPath(role, request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL(getRoleHomePath(role), request.url))
  }

  return NextResponse.next()
}

export const config = {
  // matcher: ["/dashboard/:path*"],
  matcher: [],
}
