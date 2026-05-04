"use client"

import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            aria-label="Choose theme"
            suppressHydrationWarning
          />
        }
      >
        <ActiveIcon />
        <span className="hidden sm:inline">{activeTheme.label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((item) => {
          const Icon = item.icon

          return (
            <DropdownMenuItem key={item.value} onClick={() => setTheme(item.value)}>
              <Icon />
              {item.label}
              {currentTheme === item.value ? <CheckIcon className="ml-auto" /> : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
