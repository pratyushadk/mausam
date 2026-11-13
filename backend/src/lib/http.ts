import { ApiError } from "./errors"

export async function getJson<T>(url: string, init: RequestInit = {}, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    const text = await response.text()
    const data = text ? JSON.parse(text) : null
    if (!response.ok || data?.error === true) {
      const reason = data?.reason || data?.message || `HTTP ${response.status}`
      throw new ApiError(502, "PROVIDER_ERROR", `An outside service returned an error: ${reason}`)
    }
    return data as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(502, "PROVIDER_UNAVAILABLE", "An outside service did not respond. Try again.")
  } finally {
    clearTimeout(timer)
  }
}

const memory = new Map<string, { expires: number; value: unknown }>()

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = memory.get(key)
  if (hit && hit.expires > Date.now()) return hit.value as T
  const value = await load()
  memory.set(key, { expires: Date.now() + ttlMs, value })
  return value
}
