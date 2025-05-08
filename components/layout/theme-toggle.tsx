"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Render a neutral button to avoid hydration mismatch
    return (
      <Button
        variant="outline"
        size="icon"
        className="!bg-popover/95 !backdrop-blur !border !shadow-lg text-foreground"
        aria-label="Toggle theme"
        disabled
      >
        <Sun className="h-[1.2rem] w-[1.2rem] transition-all" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  const nextTheme = resolvedTheme === "dark" ? "light" : "dark"
  const isDark = resolvedTheme === "dark"

  return (
    <Button
      variant="outline"
      size="icon"
      className="!bg-popover/95 !backdrop-blur !border !shadow-lg text-foreground"
      aria-label={`Switch to ${nextTheme} mode`}
      onClick={() => setTheme(nextTheme)}
    >
      {isDark ? (
        <Sun className="h-[1.2rem] w-[1.2rem] transition-all" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] transition-all" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
} 