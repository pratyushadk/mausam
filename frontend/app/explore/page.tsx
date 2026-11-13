"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { api, rememberedPlace } from "@/lib/api"
import type { Place } from "@/lib/types"

const MapPanel = dynamic(() => import("@/components/MapPanel"), { ssr: false, loading: () => <p>Loading map…</p> })

type Video = { id: string; title: string; channel: string; thumbnail: string }

export default function ExplorePage() {
  const [place, setPlace] = useState<Place | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [warning, setWarning] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setPlace(rememberedPlace())
  }, [])

  async function loadVideos() {
    if (!place) return
    setLoading(true)
    setWarning("")
    try {
      const data = await api<{ videos: Video[]; warning: string | null }>(`/api/videos?location=${encodeURIComponent(place.name)}`)
      setVideos(data.videos)
      setWarning(data.warning || "")
    } catch (error) {
      setWarning(error instanceof Error ? error.message : "Videos are unavailable right now.")
    } finally {
      setLoading(false)
    }
  }

  if (!place) {
    return (
      <div>
        <h1 className="text-4xl font-semibold">Explore</h1>
        <p className="mt-2 text-slate-500">Search for a place on the dashboard first. The map follows the latest place opened in this browser tab.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-semibold">Explore</h1>
        <p className="mt-1 text-slate-500">{place.name}{place.country ? `, ${place.country}` : ""}</p>
      </div>
      <MapPanel key={`${place.latitude},${place.longitude}`} place={place} />
      <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">Location videos</h2>
          <button type="button" onClick={() => void loadVideos()} disabled={loading} className="rounded-xl bg-sky-800 px-5 py-3 text-base text-white dark:bg-sky-500 dark:text-slate-950">
            {loading ? "Loading…" : "Show videos"}
          </button>
        </div>
        {warning && <p className="mt-3 text-base text-slate-500">{warning}</p>}
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {videos.map((video) => (
            <li key={video.id} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              {video.thumbnail && <img src={video.thumbnail} alt="" className="h-48 w-full object-cover" />}
              <div className="p-4">
                <a className="text-lg font-medium underline" href={`https://www.youtube-nocookie.com/embed/${video.id}`} target="_blank" rel="noreferrer">{video.title}</a>
                <p className="mt-1 text-base text-slate-500">{video.channel}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
