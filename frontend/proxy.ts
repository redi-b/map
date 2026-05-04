import { NextResponse, type NextRequest } from "next/server"

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

  const role = currentUser.profile.role as "patient" | "pharmacist" | "admin"
  const allowedPaths = {
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

  if (!allowedPaths[role]?.includes(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
