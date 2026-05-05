"use client"

import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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

const emptySubscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

function useStableTheme() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot)
  const currentTheme = mounted ? theme ?? "system" : "system"
  return { currentTheme, setTheme }
}

export function ThemeMenuGroup() {
  const { currentTheme, setTheme } = useStableTheme()

  return (
    <DropdownMenuGroup>
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
    </DropdownMenuGroup>
  )
}

export function ThemeSwitcher() {
  const { currentTheme } = useStableTheme()
  const activeTheme = themes.find((item) => item.value === currentTheme) ?? themes[2]
  const ActiveIcon = activeTheme.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full"
            aria-label="Choose theme"
            title={`Theme: ${activeTheme.label}`}
            suppressHydrationWarning
          />
        }
      >
        <ActiveIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <ThemeMenuGroup />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
