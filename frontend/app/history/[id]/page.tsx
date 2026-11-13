"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { WeatherPanel } from "@/components/WeatherPanel"
import { ApiClientError, api, downloadExport, rememberPlace } from "@/lib/api"
import type { Place, WeatherResult } from "@/lib/types"

export default function HistoryDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [weather, setWeather] = useState<WeatherResult | null>(null)
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [query, setQuery] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [candidates, setCandidates] = useState<Place[]>([])
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const data = await api<WeatherResult>(`/api/searches/${params.id}`)
      setWeather(data)
      setTitle(data.title)
      setNotes(data.notes)
      setQuery(data.location.name)
      setStartDate(data.startDate)
      setEndDate(data.endDate)
      rememberPlace(data.location)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Record not found.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // Reload when the record id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  async function saveNotes() {
    setMessage("")
    const data = await api<WeatherResult>(`/api/searches/${params.id}`, { method: "PATCH", body: JSON.stringify({ title, notes }) })
    setWeather(data)
  }

  async function changeSearch(place?: Place) {
    setMessage("")
    setCandidates([])
    try {
      const samePlace = !place && weather != null && query.trim() === weather.location.name
      const data = await api<WeatherResult>(`/api/searches/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify(place || samePlace ? {
          name: (place ?? weather?.location)?.name,
          country: (place ?? weather?.location)?.country,
          adminRegion: (place ?? weather?.location)?.adminRegion,
          timezone: (place ?? weather?.location)?.timezone,
          latitude: (place ?? weather?.location)?.latitude,
          longitude: (place ?? weather?.location)?.longitude,
          startDate,
          endDate,
          title,
          notes,
        } : { query, startDate, endDate, title, notes }),
      })
      setWeather(data)
      rememberPlace(data.location)
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "AMBIGUOUS_LOCATION") {
        const details = error.details as { candidates?: Place[] } | null
        setCandidates(details?.candidates ?? [])
      }
      setMessage(error instanceof Error ? error.message : "The search could not be updated.")
    }
  }

  async function refresh() {
    setMessage("")
    try {
      const data = await api<WeatherResult>(`/api/searches/${params.id}/refresh`, { method: "POST" })
      setWeather(data)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Refresh failed. The previous weather is still saved.")
    }
  }

  async function remove() {
    if (!confirm("Delete this saved search?")) return
    await api(`/api/searches/${params.id}`, { method: "DELETE" })
    router.push("/history")
  }

  if (loading) return <p>Loading this search…</p>
  if (!weather) return <p>{message || "Record not found."}</p>

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-semibold">{weather.title}</h1>
      <form className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" onSubmit={(event) => { event.preventDefault(); void saveNotes() }}>
        <label className="text-sm">Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <label className="text-sm">Notes
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-950" rows={3} />
        </label>
        <button className="w-fit rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">Save title and notes</button>
      </form>
      <form className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void changeSearch() }}>
        <label className="text-sm sm:col-span-2">Place
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <label className="text-sm">Start
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <label className="text-sm">End
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button className="rounded-xl bg-sky-800 px-3 py-2 text-sm text-white dark:bg-sky-500 dark:text-slate-950">Update place or dates</button>
          <button type="button" onClick={() => void refresh()} className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">Refresh weather</button>
          <button type="button" onClick={() => void downloadExport({ format: "csv", scope: "one", id: params.id })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">Export CSV</button>
          <button type="button" onClick={() => void downloadExport({ format: "json", scope: "one", id: params.id })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">Export JSON</button>
          <button type="button" onClick={() => void downloadExport({ format: "pdf", scope: "one", id: params.id })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">Export PDF</button>
          <button type="button" onClick={() => void remove()} className="rounded-xl px-3 py-2 text-sm text-rose-700 dark:text-rose-300">Delete</button>
        </div>
      </form>
      {message && <p className="text-sm text-rose-700 dark:text-rose-300">{message}</p>}
      {candidates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {candidates.map((place) => (
            <button key={`${place.latitude},${place.longitude}`} type="button" className="rounded-full border border-slate-300 px-3 py-1 text-sm dark:border-slate-700" onClick={() => void changeSearch(place)}>
              {place.name}{place.country ? `, ${place.country}` : ""}
            </button>
          ))}
        </div>
      )}
      <WeatherPanel weather={weather} />
    </div>
  )
}
