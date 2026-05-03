"use client"

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const themes = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
]

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const currentTheme = theme ?? "system"

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card p-1" suppressHydrationWarning>
      {themes.map((item) => {
        const Icon = item.icon
        const active = currentTheme === item.value

        return (
          <Button
            key={item.value}
            type="button"
            variant={active ? "secondary" : "ghost"}
            size="sm"
            className={cn("h-7 px-2 text-xs", active && "shadow-xs")}
            onClick={() => setTheme(item.value)}
          >
            <Icon data-icon="inline-start" />
            {item.label}
          </Button>
        )
      })}
    </div>
  )
}
