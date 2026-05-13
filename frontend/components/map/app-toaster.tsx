"use client"

import { Toaster } from "sileo"
import { useTheme } from "next-themes"

export function AppToaster() {
  const { resolvedTheme } = useTheme()

  return (
    <Toaster
      position="top-right"
      offset={{ top: 18, right: 18, bottom: 18 }}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      options={{
        roundness: 14,
        fill: "var(--popover)",
        styles: {
          title: "text-foreground! font-medium!",
          description: "text-muted-foreground!",
          badge: "bg-primary/10! text-primary!",
          button: "bg-primary! text-primary-foreground! shadow-sm!",
        },
      }}
    />
  )
}
