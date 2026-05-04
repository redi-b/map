"use client"

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

const themes = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
]

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const currentTheme = theme ?? "system"
  const activeTheme = themes.find((item) => item.value === currentTheme) ?? themes[2]
  const ActiveIcon = activeTheme.icon

  function cycleTheme() {
    const currentIndex = themes.findIndex((item) => item.value === currentTheme)
    const nextTheme = themes[(currentIndex + 1) % themes.length] ?? themes[0]

    setTheme(nextTheme.value)
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="rounded-full"
      aria-label={`Theme: ${activeTheme.label}`}
      title={`Theme: ${activeTheme.label}`}
      onClick={cycleTheme}
      suppressHydrationWarning
    >
      <ActiveIcon />
    </Button>
  )
}
