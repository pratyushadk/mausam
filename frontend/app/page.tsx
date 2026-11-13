"use client"

import { useState } from "react"
import { SearchBox } from "@/components/SearchBox"
import { WeatherPanel } from "@/components/WeatherPanel"
import type { WeatherResult } from "@/lib/types"

export default function DashboardPage() {
  const [weather, setWeather] = useState<WeatherResult | null>(null)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">Search a place and a date range. A successful search is saved in this browser.</p>
      </div>
      <SearchBox onResult={setWeather} />
      {weather ? <WeatherPanel weather={weather} /> : (
        <p className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-base text-slate-500 dark:border-white/15">
          Current conditions, the next five days, and your selected dates will appear here.
        </p>
      )}
    </div>
  )
}
