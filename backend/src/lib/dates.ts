import { ApiError } from "./errors"

export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

export function inclusiveDays(start: string, end: string): number {
  const from = Date.parse(`${start}T00:00:00Z`)
  const to = Date.parse(`${end}T00:00:00Z`)
  return Math.round((to - from) / 86_400_000) + 1
}

export function toDbDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

export function fromDbDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export function dayKind(date: string, today = todayUTC()): "historical" | "current" | "forecast" {
  if (date < today) return "historical"
  if (date > today) return "forecast"
  return "current"
}

export function dayMeaning(kind: string, _source: string): string {
  if (kind === "forecast") return "Forecast"
  if (kind === "current") return "Live"
  return "Past"
}

/** Future searches stay inside the 16-day forecast. Past searches can cover 31 days. */
export function validateRange(start: string, end: string, today = todayUTC()) {
  if (!isIsoDate(start) || !isIsoDate(end)) {
    throw new ApiError(422, "DATE_RANGE_INVALID", "Enter dates as YYYY-MM-DD.")
  }
  if (start > end) {
    throw new ApiError(422, "DATE_RANGE_INVALID", "Start date is after the end date.")
  }
  if (start < "1940-01-01") {
    throw new ApiError(422, "DATE_RANGE_INVALID", "Weather data is available from 1940-01-01.")
  }

  const span = inclusiveDays(start, end)
  const forecastEnd = addDays(today, 15)
  if (end > today) {
    if (end > forecastEnd) {
      throw new ApiError(422, "DATE_RANGE_INVALID", `Forecasts are available through ${forecastEnd}. Choose an earlier end date.`)
    }
    if (span > 16) {
      throw new ApiError(422, "DATE_RANGE_INVALID", "A search that includes a future day can cover at most 16 days.")
    }
    return
  }
  if (span > 31) {
    throw new ApiError(422, "DATE_RANGE_INVALID", "A past search can cover at most 31 days.")
  }
}
