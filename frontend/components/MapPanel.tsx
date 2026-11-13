"use client"

import { useEffect, useState } from "react"
import { CircleMarker, MapContainer, TileLayer } from "react-leaflet"
import type { Place } from "@/lib/types"
import "leaflet/dist/leaflet.css"

type Frame = { time: number; path: string }

const tileUrl = process.env.NEXT_PUBLIC_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png"

export default function MapPanel({ place }: { place: Place }) {
  const [host, setHost] = useState("")
  const [frames, setFrames] = useState<Frame[]>([])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [mapError, setMapError] = useState("")

  useEffect(() => {
    let ignore = false
    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then((response) => response.json())
      .then((data) => {
        if (ignore) return
        const past = (data.radar?.past ?? []) as Frame[]
        setHost(data.host || "")
        setFrames(past)
        setIndex(Math.max(past.length - 1, 0))
      })
      .catch(() => {
        if (!ignore) setMapError("Radar frames are unavailable. The map still shows the location.")
      })
    return () => {
      ignore = true
    }
  }, [place.latitude, place.longitude])

  useEffect(() => {
    if (!playing || frames.length === 0) return
    const timer = setInterval(() => setIndex((current) => (current + 1) % frames.length), 700)
    return () => clearInterval(timer)
  }, [playing, frames.length])

  const frame = frames[index]
  const radarUrl = host && frame ? `${host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png` : ""

  return (
    <div>
      <div className="h-72 overflow-hidden rounded-2xl border border-slate-200 sm:h-96 dark:border-slate-800">
        <MapContainer center={[place.latitude, place.longitude]} zoom={8} style={{ height: "100%", width: "100%" }}>
          <TileLayer attribution='&copy; OpenStreetMap contributors' url={tileUrl} />
          {radarUrl && (
            <TileLayer key={frame.path} url={radarUrl} opacity={0.7} maxNativeZoom={7} maxZoom={12} attribution='Weather data by <a href="https://www.rainviewer.com/">RainViewer</a>' />
          )}
          <CircleMarker center={[place.latitude, place.longitude]} radius={8} pathOptions={{ color: "#0369a1", fillColor: "#38bdf8", fillOpacity: 0.9 }} />
        </MapContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-base dark:border-slate-700" onClick={() => setPlaying((value) => !value)} disabled={frames.length === 0}>
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-base dark:border-slate-700" onClick={() => setIndex((value) => (value - 1 + frames.length) % frames.length)} disabled={frames.length === 0}>
          Previous
        </button>
        <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-base dark:border-slate-700" onClick={() => setIndex((value) => (value + 1) % frames.length)} disabled={frames.length === 0}>
          Next
        </button>
        <span>{frame ? new Date(frame.time * 1000).toLocaleString() : "No radar frame"}</span>
      </div>
      <p className="mt-2 text-sm text-slate-500">This layer is precipitation radar for about the past two hours, not a cloud-motion map. Coverage is not worldwide, so a clear map means no radar return there.</p>
      {mapError && <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{mapError}</p>}
    </div>
  )
}
