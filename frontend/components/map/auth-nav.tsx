import { PillIcon } from "lucide-react"
import Link from "next/link"
import { ThemeSwitcher } from "./theme-switcher"

export function AuthNav() {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
      <Link href="/" className="flex items-center gap-3 font-[var(--font-display)] font-semibold">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <PillIcon />
        </span>
        MAP
      </Link>
      <ThemeSwitcher />
    </header>
  )
}
