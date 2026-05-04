import { ShieldCheckIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeSwitcher } from "./theme-switcher"

export function PublicNav() {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
      <Link href="/" className="flex items-center gap-3 font-[var(--font-display)] font-semibold">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheckIcon className="size-5" />
        </span>
        MAP
      </Link>
      <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
        <a href="#how-it-works">How it works</a>
        <a href="#roles">Roles</a>
        <a href="#trust">Trust</a>
      </nav>
      <div className="flex items-center gap-2">
        <div className="hidden sm:block">
          <ThemeSwitcher />
        </div>
        <Button variant="ghost" render={<Link href="/login" />}>Sign in</Button>
        <Button render={<Link href="/register" />}>Create account</Button>
      </div>
    </header>
  )
}
