"use client"

import { usePrefs } from "@/lib/prefs"

export default function SettingsPage() {
  const { theme, units, setTheme, setUnits } = usePrefs()
  return (
    <div className="space-y-5">
      <h1 className="text-4xl font-semibold">Settings</h1>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">Theme</h2>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setTheme("light")} className={`rounded-xl px-3 py-2 text-sm ${theme === "light" ? "bg-sky-800 text-white" : "border border-slate-300 dark:border-slate-700"}`}>Light</button>
          <button type="button" onClick={() => setTheme("dark")} className={`rounded-xl px-3 py-2 text-sm ${theme === "dark" ? "bg-sky-500 text-slate-950" : "border border-slate-300 dark:border-slate-700"}`}>Dark</button>
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">Units</h2>
        <p className="mt-1 text-sm text-slate-500">The database and exports stay in Celsius, km/h, and millimetres. This changes the screen only.</p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setUnits("metric")} className={`rounded-xl px-3 py-2 text-sm ${units === "metric" ? "bg-sky-800 text-white dark:bg-sky-500 dark:text-slate-950" : "border border-slate-300 dark:border-slate-700"}`}>Metric</button>
          <button type="button" onClick={() => setUnits("imperial")} className={`rounded-xl px-3 py-2 text-sm ${units === "imperial" ? "bg-sky-800 text-white dark:bg-sky-500 dark:text-slate-950" : "border border-slate-300 dark:border-slate-700"}`}>Imperial</button>
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm leading-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">About</h2>
        <p className="mt-2">Mausam is a weather workspace built by Pratyush.</p>
      </section>
    </div>
  )
}
