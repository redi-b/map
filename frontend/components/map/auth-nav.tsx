import { ShieldCheckIcon } from "lucide-react"
import Link from "next/link"
import { ThemeSwitcher } from "./theme-switcher"

export function AuthNav() {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
      <Link href="/" className="flex items-center gap-3 font-[var(--font-display)] font-semibold">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm shadow-primary/20">
          <ShieldCheckIcon />
        </span>
        <span className="flex flex-col leading-none">
          <span>MAP</span>
          <span className="mt-1 font-sans text-xs font-medium text-muted-foreground">
            Medicine Access
          </span>
        </span>
      </Link>
      <ThemeSwitcher />
    </header>
  )
}
