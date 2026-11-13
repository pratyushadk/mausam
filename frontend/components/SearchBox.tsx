"use client"

import { useEffect, useState } from "react"
import { ApiClientError, api, rememberPlace, searchPlaces } from "@/lib/api"
import { localToday } from "@/lib/format"
import type { Place, WeatherResult } from "@/lib/types"

type Selection = Place & { fromGps?: boolean }

export function SearchBox({ onResult }: { onResult: (weather: WeatherResult) => void }) {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<Place[]>([])
  const [selected, setSelected] = useState<Selection | null>(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [candidates, setCandidates] = useState<Place[]>([])
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const today = localToday()
    setStartDate(today)
    setEndDate(today)
  }, [])

  useEffect(() => {
    if (selected || query.trim().length < 2) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(() => {
      searchPlaces(query.trim()).then(setSuggestions).catch(() => setSuggestions([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [query, selected])

  async function submit(place?: Selection | null) {
    setLoading(true)
    setMessage("")
    setCandidates([])
    const choice = place === undefined ? selected : place
    try {
      const saved = await api<WeatherResult>("/api/searches", {
        method: "POST",
        body: JSON.stringify({
          query: query.trim() || choice?.name,
          startDate,
          endDate,
          latitude: choice?.latitude,
          longitude: choice?.longitude,
          name: choice?.fromGps ? undefined : choice?.name,
          country: choice?.country,
          adminRegion: choice?.adminRegion,
          timezone: choice?.timezone,
        }),
      })
      rememberPlace(saved.location)
      onResult(saved)
      setSuggestions([])
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "AMBIGUOUS_LOCATION") {
        const details = error.details as { candidates?: Place[] } | null
        setCandidates(details?.candidates ?? [])
        setMessage(error.message)
      } else if (error instanceof ApiClientError && error.code === "SAVE_FAILED") {
        const details = error.details as { weather?: WeatherResult } | null
        if (details?.weather) onResult(details.weather)
        setMessage(error.message)
      } else {
        setMessage(error instanceof Error ? error.message : "Search failed.")
      }
    } finally {
      setLoading(false)
    }
  }

  function useGps() {
    if (!navigator.geolocation) {
      setMessage("This browser cannot share your location. Type a place instead.")
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const place: Selection = {
          name: "Current location",
          country: null,
          adminRegion: null,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timezone: null,
          fromGps: true,
        }
        setSelected(place)
        setQuery("Current location")
        setSuggestions([])
      },
      () => setMessage("Location permission was denied. Type a place instead."),
    )
  }

  return (
    <form
      className="rise rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#152033]"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <label className="text-base font-medium" htmlFor="location">Location</label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="location"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setSelected(null)
          }}
          placeholder="City, postal code, landmark, or 28.61, 77.20"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base dark:border-slate-700 dark:bg-slate-950"
        />
        <button type="button" onClick={useGps} className="w-full rounded-xl border border-slate-300 px-5 py-3 text-base sm:w-auto dark:border-slate-700">
          Use my location
        </button>
      </div>
      {suggestions.length > 0 && (
        <ul className="mt-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          {suggestions.map((place) => (
            <li key={`${place.latitude},${place.longitude},${place.name}`}>
              <button
                type="button"
                className="w-full px-4 py-3 text-left text-base hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => {
                  setSelected(place)
                  setQuery(`${place.name}${place.adminRegion ? `, ${place.adminRegion}` : ""}${place.country ? `, ${place.country}` : ""}`)
                  setSuggestions([])
                }}
              >
                {place.name}{place.adminRegion ? `, ${place.adminRegion}` : ""}{place.country ? `, ${place.country}` : ""}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-base">
          Start date
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <label className="text-base">
          End date
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base dark:border-slate-700 dark:bg-slate-950" />
        </label>
      </div>
      <p className="mt-3 text-base text-slate-500">Past searches can cover 31 days. A search that includes a future day can cover 16 days, through the available forecast.</p>
      <button type="submit" disabled={loading} className="mt-4 rounded-xl bg-sky-800 px-5 py-3 text-base font-medium text-white disabled:opacity-60 dark:bg-sky-500 dark:text-slate-950">
        {loading ? "Searching…" : "Search weather"}
      </button>
      {message && <p className="mt-3 text-sm text-rose-700 dark:text-rose-300">{message}</p>}
      {candidates.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {candidates.map((place) => (
            <button
              key={`${place.latitude},${place.longitude}`}
              type="button"
              className="rounded-full border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
              onClick={() => {
                setSelected(place)
                setQuery(place.name)
                void submit(place)
              }}
            >
              {place.name}{place.country ? `, ${place.country}` : ""}
            </button>
          ))}
        </div>
      )}
    </form>
  )
}
