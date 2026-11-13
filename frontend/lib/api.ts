import type { Place, SearchSummary, WeatherResult } from "./types"

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"

export class ApiClientError extends Error {
  status: number
  code: string
  details: unknown

  constructor(status: number, code: string, message: string, details: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export function getClientId() {
  const key = "mausam-client-id"
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const created = crypto.randomUUID()
  localStorage.setItem(key, created)
  return created
}

export function rememberPlace(place: Place) {
  sessionStorage.setItem("mausam-place", JSON.stringify(place))
}

export function rememberedPlace(): Place | null {
  const raw = sessionStorage.getItem("mausam-place")
  if (!raw) return null
  try {
    return JSON.parse(raw) as Place
  } catch {
    return null
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set("X-Client-Id", getClientId())
  if (init.body) headers.set("Content-Type", "application/json")
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  } catch {
    throw new ApiClientError(0, "NETWORK", "The API is not running. Start the backend and try again.", null)
  }
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiClientError(response.status, data?.error?.code || "REQUEST_FAILED", data?.error?.message || "Request failed.", data?.error?.details)
  }
  return data as T
}

export async function searchPlaces(query: string) {
  const data = await api<{ places: Place[] }>(`/api/locations/search?q=${encodeURIComponent(query)}`)
  return data.places
}

export async function downloadExport(params: Record<string, string>) {
  const url = new URL(`${API_BASE}/api/exports`)
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value)
  }
  const response = await fetch(url, { headers: { "X-Client-Id": getClientId() } })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new ApiClientError(response.status, data?.error?.code || "EXPORT_FAILED", data?.error?.message || "Export failed.", data?.error?.details)
  }
  const blob = await response.blob()
  const match = (response.headers.get("Content-Disposition") || "").match(/filename="([^"]+)"/)
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = match?.[1] || "mausam"
  link.click()
  URL.revokeObjectURL(link.href)
}

export type SearchList = { items: SearchSummary[]; page: number; pageSize: number; total: number }
export type { WeatherResult }
