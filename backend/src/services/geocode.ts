import { env } from "../env"
import { ApiError } from "../lib/errors"
import { cached, getJson } from "../lib/http"
import type { Place } from "../types"

const USER_AGENT = "Mausam/1.0 (educational assessment)"
let lastNominatimCall = 0

type OpenMeteoResult = {
  name: string
  country?: string
  admin1?: string
  latitude: number
  longitude: number
  timezone?: string
}

function place(input: {
  name: string
  country?: string | null
  adminRegion?: string | null
  latitude: number
  longitude: number
  timezone?: string | null
}): Place {
  return {
    name: input.name,
    country: input.country || null,
    adminRegion: input.adminRegion || null,
    latitude: input.latitude,
    longitude: input.longitude,
    timezone: input.timezone || null,
  }
}

export function parseCoordinates(query: string): Place | null {
  const match = query.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
  if (!match) return null
  const latitude = Number(match[1])
  const longitude = Number(match[2])
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null
  return place({ name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, latitude, longitude })
}

async function openMeteo(query: string): Promise<Place[]> {
  const url = new URL(env.OPEN_METEO_GEOCODING_URL)
  url.searchParams.set("name", query)
  url.searchParams.set("count", "5")
  url.searchParams.set("language", "en")
  const data = await getJson<{ results?: OpenMeteoResult[] }>(url.toString())
  return (data.results ?? []).map((item) =>
    place({
      name: item.name,
      country: item.country,
      adminRegion: item.admin1,
      latitude: item.latitude,
      longitude: item.longitude,
      timezone: item.timezone,
    }),
  )
}

async function nominatimGet<T>(url: string): Promise<T> {
  const wait = lastNominatimCall + 1100 - Date.now()
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  lastNominatimCall = Date.now()
  return getJson<T>(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } })
}

type NominatimItem = {
  display_name?: string
  lat: string
  lon: string
  address?: { country?: string; state?: string; city?: string; town?: string; village?: string }
}

function fromNominatim(item: NominatimItem): Place {
  const address = item.address ?? {}
  const name = address.city || address.town || address.village || item.display_name?.split(",")[0] || "Selected place"
  return place({
    name,
    country: address.country,
    adminRegion: address.state,
    latitude: Number(item.lat),
    longitude: Number(item.lon),
  })
}

async function nominatimSearch(query: string): Promise<Place[]> {
  const url = new URL(`${env.NOMINATIM_BASE_URL}/search`)
  url.searchParams.set("q", query)
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("limit", "5")
  url.searchParams.set("addressdetails", "1")
  const data = await nominatimGet<NominatimItem[]>(url.toString())
  return data.map(fromNominatim).filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const coordinates = parseCoordinates(query)
  if (coordinates) return [coordinates]
  const key = query.trim().toLowerCase()
  return cached(`geo:${key}`, 24 * 60 * 60 * 1000, () => openMeteo(query.trim()))
}

export async function resolvePlace(input: {
  query?: string
  latitude?: number
  longitude?: number
  name?: string
  country?: string | null
  adminRegion?: string | null
  timezone?: string | null
}): Promise<Place> {
  if (input.latitude != null && input.longitude != null) {
    if (input.name) {
      return place({
        name: input.name,
        country: input.country,
        adminRegion: input.adminRegion,
        latitude: input.latitude,
        longitude: input.longitude,
        timezone: input.timezone,
      })
    }
    try {
      const url = new URL(`${env.NOMINATIM_BASE_URL}/reverse`)
      url.searchParams.set("lat", String(input.latitude))
      url.searchParams.set("lon", String(input.longitude))
      url.searchParams.set("format", "jsonv2")
      url.searchParams.set("addressdetails", "1")
      const data = await nominatimGet<NominatimItem>(url.toString())
      const resolved = fromNominatim(data)
      return { ...resolved, latitude: input.latitude, longitude: input.longitude }
    } catch {
      return place({
        name: `${input.latitude.toFixed(4)}, ${input.longitude.toFixed(4)}`,
        latitude: input.latitude,
        longitude: input.longitude,
      })
    }
  }

  const query = input.query?.trim() ?? ""
  if (!query) throw new ApiError(422, "LOCATION_REQUIRED", "Enter a location or use your current position.")
  const coordinates = parseCoordinates(query)
  if (coordinates) return resolvePlace({ latitude: coordinates.latitude, longitude: coordinates.longitude, query })

  let matches = await openMeteo(query)
  if (matches.length === 0) matches = await nominatimSearch(query)
  if (matches.length === 0) {
    throw new ApiError(404, "LOCATION_NOT_FOUND", "No matching place. Check the spelling, or enter latitude, longitude.")
  }
  if (matches.length > 1) {
    throw new ApiError(409, "AMBIGUOUS_LOCATION", "Several places match. Choose one.", { candidates: matches })
  }
  return matches[0]
}
