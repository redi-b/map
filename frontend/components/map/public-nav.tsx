"use client"

import { ShieldCheckIcon } from "lucide-react"
import Link from "next/link"
import { LandingAuthActions } from "./landing-auth-actions"
import { ThemeSwitcher } from "./theme-switcher"

export function PublicNav() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="flex items-center gap-3 font-[var(--font-display)] font-semibold">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ShieldCheckIcon />
          </span>
          MAP
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link className="transition hover:text-foreground" href="/#how-it-works">How it works</Link>
          <Link className="transition hover:text-foreground" href="/#for-patients">For patients</Link>
          <Link className="transition hover:text-foreground" href="/#for-pharmacies">For pharmacies</Link>
        </nav>
        <div className="flex items-center gap-2">
          <LandingAuthActions />
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  )
}
