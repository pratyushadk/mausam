"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { api, downloadExport, type SearchList } from "@/lib/api"
import type { SearchSummary } from "@/lib/types"

export default function HistoryPage() {
  const [items, setItems] = useState<SearchSummary[]>([])
  const [total, setTotal] = useState(0)
  const [location, setLocation] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [format, setFormat] = useState("csv")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    setMessage("")
    const params = new URLSearchParams({ pageSize: "20" })
    if (location.trim()) params.set("location", location.trim())
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    try {
      const data = await api<SearchList>(`/api/searches?${params}`)
      setItems(data.items)
      setTotal(data.total)
      setSelected([])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "History could not be loaded.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // The first view loads this browser's latest searches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function exportScope(scope: string, extra: Record<string, string> = {}) {
    setMessage("")
    try {
      await downloadExport({ format, scope, ...extra })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export failed.")
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this saved search?")) return
    await api(`/api/searches/${id}`, { method: "DELETE" })
    await load()
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-4xl font-semibold">Weather History</h1>
        <p className="mt-1 text-sm text-slate-500">These searches belong to this browser. Another browser has its own history.</p>
      </div>
      <form className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4 dark:border-slate-800 dark:bg-slate-900" onSubmit={(event) => { event.preventDefault(); void load() }}>
        <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Filter by place" className="rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
        <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
        <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
        <button className="rounded-xl bg-sky-800 px-3 py-2 text-sm text-white dark:bg-sky-500 dark:text-slate-950">Apply</button>
      </form>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label>
          Format
          <select value={format} onChange={(event) => setFormat(event.target.value)} className="ml-2 rounded-xl border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-950">
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="pdf">PDF</option>
          </select>
        </label>
        <button type="button" className="rounded-xl border border-slate-300 px-3 py-1 dark:border-slate-700" onClick={() => void exportScope("all")}>Export all</button>
        <button type="button" className="rounded-xl border border-slate-300 px-3 py-1 dark:border-slate-700" onClick={() => void exportScope("filter", { location, from, to })}>Export filtered</button>
        <button type="button" disabled={selected.length === 0} className="rounded-xl border border-slate-300 px-3 py-1 disabled:opacity-50 dark:border-slate-700" onClick={() => void exportScope("selected", { ids: selected.join(",") })}>Export selected</button>
      </div>
      {message && <p className="text-sm text-rose-700 dark:text-rose-300">{message}</p>}
      {loading ? <p>Loading saved searches…</p> : items.length === 0 ? (message ? null : <p>No saved searches yet. A dashboard search will appear here.</p>) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="px-4 py-3"></th>
                <th className="px-3 py-3 font-medium">Search</th>
                <th className="px-3 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${item.title}`}
                      checked={selected.includes(item.id)}
                      onChange={(event) => setSelected((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/history/${item.id}`} className="font-medium underline">{item.title}</Link>
                    <p className="text-slate-500">{item.locationName}{item.country ? `, ${item.country}` : ""}</p>
                  </td>
                  <td className="px-3 py-3">{item.startDate} to {item.endDate}</td>
                  <td className="px-4 py-3">
                    <button type="button" className="text-rose-700 dark:text-rose-300" onClick={() => void remove(item.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-3 text-sm text-slate-500">{total} saved search{total === 1 ? "" : "es"} in this browser.</p>
        </div>
      )}
    </div>
  )
}
