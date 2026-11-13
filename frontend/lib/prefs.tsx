"use client"

import { createContext, useContext, useEffect, useState } from "react"
import type { UnitSystem } from "./format"

type Prefs = {
  theme: "light" | "dark"
  units: UnitSystem
  setTheme: (theme: "light" | "dark") => void
  setUnits: (units: UnitSystem) => void
}

const PrefsContext = createContext<Prefs | null>(null)

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<"light" | "dark">("light")
  const [units, setUnitsState] = useState<UnitSystem>("metric")

  useEffect(() => {
    const storedTheme = localStorage.getItem("mausam-theme")
    const storedUnits = localStorage.getItem("mausam-units")
    if (storedTheme === "dark" || storedTheme === "light") setThemeState(storedTheme)
    if (storedUnits === "imperial" || storedUnits === "metric") setUnitsState(storedUnits)
  }, [])

  function setTheme(next: "light" | "dark") {
    setThemeState(next)
    localStorage.setItem("mausam-theme", next)
    document.documentElement.classList.toggle("dark", next === "dark")
  }

  function setUnits(next: UnitSystem) {
    setUnitsState(next)
    localStorage.setItem("mausam-units", next)
  }

  return <PrefsContext.Provider value={{ theme, units, setTheme, setUnits }}>{children}</PrefsContext.Provider>
}

export function usePrefs() {
  const prefs = useContext(PrefsContext)
  if (!prefs) throw new Error("Preferences are unavailable.")
  return prefs
}
