"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { api, type SearchList } from "@/lib/api"
import type { SearchSummary } from "@/lib/types"

export default function LocationsPage() {
  const [groups, setGroups] = useState<Array<{ key: string; place: string; count: number; latest: SearchSummary }>>([])
  const [message, setMessage] = useState("")

  useEffect(() => {
    api<SearchList>("/api/searches?pageSize=100")
      .then((data) => {
        const map = new Map<string, { key: string; place: string; count: number; latest: SearchSummary }>()
        for (const item of data.items) {
          const key = `${item.locationName}|${item.latitude.toFixed(2)}|${item.longitude.toFixed(2)}`
          const existing = map.get(key)
          if (!existing) map.set(key, { key, place: `${item.locationName}${item.country ? `, ${item.country}` : ""}`, count: 1, latest: item })
          else existing.count += 1
        }
        setGroups([...map.values()])
        if (data.total > data.items.length) setMessage("Showing places from the 100 most recent searches.")
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Locations could not be loaded."))
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-4xl font-semibold">Saved Locations</h1>
      <p className="text-sm text-slate-500">Places already searched in this browser, grouped from weather history.</p>
      {message && <p className="text-sm text-slate-500">{message}</p>}
      {groups.length === 0 ? (message ? null : <p>No places yet.</p>) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {groups.map((group) => (
            <li key={group.key} className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-semibold">{group.place}</h2>
              <p className="mt-1 text-sm text-slate-500">{group.count} search{group.count === 1 ? "" : "es"}</p>
              <Link href={`/history/${group.latest.id}`} className="mt-3 inline-block text-sm underline">Open the latest search</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
