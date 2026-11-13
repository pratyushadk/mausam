export type UnitSystem = "metric" | "imperial"

export function weatherLabel(code: number | null) {
  if (code == null) return "Not available"
  if (code === 0) return "Clear"
  if (code <= 3) return "Cloudy"
  if (code <= 48) return "Fog"
  if (code <= 57) return "Drizzle"
  if (code <= 67) return "Rain"
  if (code <= 77) return "Snow"
  if (code <= 82) return "Showers"
  if (code <= 86) return "Snow showers"
  if (code >= 95) return "Thunderstorm"
  return "Unknown conditions"
}

export function iconName(code: number | null): "clear" | "partly" | "cloud" | "fog" | "rain" | "snow" | "storm" {
  if (code == null || code === 0) return "clear"
  if (code <= 2) return "partly"
  if (code === 3) return "cloud"
  if (code <= 48) return "fog"
  if (code <= 67) return "rain"
  if (code <= 77) return "snow"
  if (code <= 82) return "rain"
  if (code <= 86) return "snow"
  if (code >= 95) return "storm"
  return "cloud"
}

export function temperature(value: number | null, units: UnitSystem) {
  if (value == null) return "—"
  const converted = units === "imperial" ? (value * 9) / 5 + 32 : value
  return `${converted.toFixed(1)}°`
}

export function tempUnit(units: UnitSystem) {
  return units === "imperial" ? "°F" : "°C"
}

export function wind(value: number | null, units: UnitSystem) {
  if (value == null) return "—"
  const converted = units === "imperial" ? value * 0.621371 : value
  return `${converted.toFixed(0)} ${units === "imperial" ? "mph" : "km/h"}`
}

export function rain(value: number | null, units: UnitSystem) {
  if (value == null) return "—"
  const converted = units === "imperial" ? value / 25.4 : value
  return `${converted.toFixed(units === "imperial" ? 2 : 1)} ${units === "imperial" ? "in" : "mm"}`
}

export function compass(degrees: number | null) {
  if (degrees == null) return ""
  const names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
  return names[Math.round(degrees / 45) % 8]
}

export function shortDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
}

export function displayType(kind: string) {
  if (kind === "current") return "Live"
  if (kind === "forecast") return "Forecast"
  return "Past"
}

export function localToday() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export function hourLabel(time: string) {
  const match = time.match(/T(\d{2})/)
  return match ? `${match[1]}:00` : time
}
