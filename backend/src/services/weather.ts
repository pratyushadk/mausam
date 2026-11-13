import { env } from "../env"
import { addDays, dayKind, dayMeaning, todayUTC } from "../lib/dates"
import { cached, getJson } from "../lib/http"
import type { CurrentWeather, DailyPoint, HourlyPoint } from "../types"

const DAILY = "weather_code,temperature_2m_max,temperature_2m_min,temperature_2m_mean,apparent_temperature_max,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant"
const DAILY_WITH_UV = `${DAILY},uv_index_max`

type ProviderDaily = {
  time?: string[]
  weather_code?: Array<number | null>
  temperature_2m_max?: Array<number | null>
  temperature_2m_min?: Array<number | null>
  temperature_2m_mean?: Array<number | null>
  apparent_temperature_max?: Array<number | null>
  precipitation_sum?: Array<number | null>
  wind_speed_10m_max?: Array<number | null>
  wind_direction_10m_dominant?: Array<number | null>
  uv_index_max?: Array<number | null>
}

type ForecastBody = {
  timezone?: string
  current?: Record<string, number | string | null>
  hourly?: {
    time?: string[]
    temperature_2m?: Array<number | null>
    precipitation?: Array<number | null>
    weather_code?: Array<number | null>
    uv_index?: Array<number | null>
  }
  daily?: ProviderDaily
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function readDaily(daily: ProviderDaily | undefined, source: string, today: string): DailyPoint[] {
  if (!daily?.time) return []
  return daily.time.map((date, index) => {
    const kind = dayKind(date, today)
    return {
      date,
      kind,
      meaning: dayMeaning(kind, source),
      temperatureMax: num(daily.temperature_2m_max?.[index]),
      temperatureMin: num(daily.temperature_2m_min?.[index]),
      temperatureMean: num(daily.temperature_2m_mean?.[index]),
      apparentTemperatureMax: num(daily.apparent_temperature_max?.[index]),
      precipitationSum: num(daily.precipitation_sum?.[index]),
      windSpeedMax: num(daily.wind_speed_10m_max?.[index]),
      windDirection: num(daily.wind_direction_10m_dominant?.[index]),
      weatherCode: num(daily.weather_code?.[index]),
      uvIndexMax: num(daily.uv_index_max?.[index]),
      source,
    }
  })
}

function between(days: DailyPoint[], start: string, end: string) {
  return days.filter((day) => day.date >= start && day.date <= end)
}

async function forecastCall(lat: number, lon: number, params: Record<string, string>) {
  const url = new URL(env.OPEN_METEO_FORECAST_URL)
  url.searchParams.set("latitude", String(lat))
  url.searchParams.set("longitude", String(lon))
  url.searchParams.set("timezone", "auto")
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return getJson<ForecastBody>(url.toString())
}

async function archiveCall(lat: number, lon: number, start: string, end: string) {
  const url = new URL(env.OPEN_METEO_ARCHIVE_URL)
  url.searchParams.set("latitude", String(lat))
  url.searchParams.set("longitude", String(lon))
  url.searchParams.set("timezone", "auto")
  url.searchParams.set("start_date", start)
  url.searchParams.set("end_date", end)
  url.searchParams.set("daily", DAILY)
  return getJson<ForecastBody>(url.toString())
}

async function dailyForRange(lat: number, lon: number, start: string, end: string, today: string) {
  const forecastStart = addDays(today, -92)
  if (end < forecastStart) {
    const body = await archiveCall(lat, lon, start, end)
    return { days: between(readDaily(body.daily, "open-meteo-archive", today), start, end), timezone: body.timezone ?? null }
  }
  if (start >= forecastStart) {
    const body = await forecastCall(lat, lon, { daily: DAILY_WITH_UV, start_date: start, end_date: end })
    return { days: between(readDaily(body.daily, "open-meteo-forecast", today), start, end), timezone: body.timezone ?? null }
  }
  const olderEnd = addDays(forecastStart, -1)
  const [older, recent] = await Promise.all([
    archiveCall(lat, lon, start, olderEnd),
    forecastCall(lat, lon, { daily: DAILY_WITH_UV, start_date: forecastStart, end_date: end }),
  ])
  const days = [
    ...between(readDaily(older.daily, "open-meteo-archive", today), start, olderEnd),
    ...between(readDaily(recent.daily, "open-meteo-forecast", today), forecastStart, end),
  ]
  return { days, timezone: recent.timezone ?? older.timezone ?? null }
}

function readCurrent(body: ForecastBody): CurrentWeather | null {
  const current = body.current
  if (!current) return null
  const times = body.hourly?.time ?? []
  const currentTime = typeof current.time === "string" ? current.time : null
  const hourIndex = currentTime ? times.indexOf(currentTime) : 0
  const uvIndex = num(body.hourly?.uv_index?.[hourIndex >= 0 ? hourIndex : 0])
  return {
    time: currentTime,
    temperature: num(current.temperature_2m),
    apparentTemperature: num(current.apparent_temperature),
    humidity: num(current.relative_humidity_2m),
    windSpeed: num(current.wind_speed_10m),
    windDirection: num(current.wind_direction_10m),
    precipitation: num(current.precipitation),
    weatherCode: num(current.weather_code),
    uvIndex,
    label: "Live",
  }
}

function readHourly(body: ForecastBody): HourlyPoint[] {
  const hourly = body.hourly
  if (!hourly?.time) return []
  return hourly.time.slice(0, 48).map((time, index) => ({
    time,
    temperature: num(hourly.temperature_2m?.[index]),
    precipitation: num(hourly.precipitation?.[index]),
    weatherCode: num(hourly.weather_code?.[index]),
  }))
}

export async function fetchWeather(lat: number, lon: number, start: string, end: string) {
  const today = todayUTC()
  const key = `${lat.toFixed(2)},${lon.toFixed(2)},${start},${end},${today}`
  return cached(`weather:${key}`, 10 * 60 * 1000, async () => {
    const live = await forecastCall(lat, lon, {
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m",
      hourly: "temperature_2m,precipitation,weather_code,uv_index",
      daily: DAILY_WITH_UV,
      forecast_days: "5",
    })
    const forecast = readDaily(live.daily, "open-meteo-forecast", today).slice(0, 5)
    const covered = start >= today && end <= addDays(today, 4)
    const range = covered
      ? { days: between(forecast, start, end), timezone: live.timezone ?? null }
      : await dailyForRange(lat, lon, start, end, today)
    return {
      timezone: range.timezone ?? live.timezone ?? null,
      current: readCurrent(live),
      hourly: readHourly(live),
      forecast,
      daily: range.days,
    }
  })
}
