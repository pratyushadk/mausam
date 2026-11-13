import { env } from "../env"
import { cached, getJson } from "../lib/http"
import type { AirQuality, CurrentWeather, DailyPoint, Notice, OfficialAlert } from "../types"

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export async function fetchAir(lat: number, lon: number): Promise<AirQuality | null> {
  try {
    const url = new URL(env.OPEN_METEO_AIR_QUALITY_URL)
    url.searchParams.set("latitude", String(lat))
    url.searchParams.set("longitude", String(lon))
    url.searchParams.set("current", "us_aqi,european_aqi,pm2_5,pm10,nitrogen_dioxide,ozone")
    url.searchParams.set("timezone", "auto")
    const data = await getJson<{ current?: Record<string, number | string | null> }>(url.toString())
    const current = data.current
    if (!current) return null
    return {
      time: typeof current.time === "string" ? current.time : null,
      usAqi: num(current.us_aqi),
      europeanAqi: num(current.european_aqi),
      pm2_5: num(current.pm2_5),
      pm10: num(current.pm10),
      nitrogenDioxide: num(current.nitrogen_dioxide),
      ozone: num(current.ozone),
    }
  } catch (error) {
    console.error("Air quality lookup failed", error)
    return null
  }
}

export function buildNotices(current: CurrentWeather | null, daily: DailyPoint[], air: AirQuality | null): Notice[] {
  const notices: Notice[] = []
  const wind = Math.max(current?.windSpeed ?? 0, ...daily.map((day) => day.windSpeedMax ?? 0))
  const rain = Math.max(0, ...daily.map((day) => day.precipitationSum ?? 0))
  const uv = Math.max(current?.uvIndex ?? 0, ...daily.map((day) => day.uvIndexMax ?? 0))
  if (wind >= 40) notices.push({ title: "Strong wind", detail: `Wind reaches ${Math.round(wind)} km/h in this result.` })
  if (rain >= 10) notices.push({ title: "Heavy rain", detail: `A day in this result has ${rain.toFixed(1)} mm of precipitation.` })
  if (uv >= 8) notices.push({ title: "High UV", detail: `UV index reaches ${uv.toFixed(1)}.` })
  if (daily.some((day) => (day.weatherCode ?? 0) >= 95) || (current?.weatherCode ?? 0) >= 95) {
    notices.push({ title: "Thunderstorm", detail: "Thunderstorm conditions appear in this result." })
  }
  if ((air?.usAqi ?? 0) >= 150 || (air?.europeanAqi ?? 0) >= 80) {
    notices.push({ title: "Poor air quality", detail: "The air-quality model is in a high range for this place." })
  }
  return notices
}

export async function fetchOfficialAlerts(lat: number, lon: number): Promise<OfficialAlert[]> {
  try {
    const url = `https://api.weather.gov/alerts/active?point=${lat},${lon}`
    const data = await getJson<{ features?: Array<{ properties?: { event?: string; headline?: string; severity?: string } }> }>(url, {
      headers: {
        Accept: "application/geo+json",
        "User-Agent": "(Mausam, educational weather app)",
      },
    })
    return (data.features ?? []).slice(0, 5).map((feature) => ({
      event: feature.properties?.event || "Weather alert",
      headline: feature.properties?.headline || "",
      severity: feature.properties?.severity || "",
    }))
  } catch (error) {
    console.error("U.S. alert lookup failed", error)
    return []
  }
}

export async function searchVideos(location: string): Promise<{ videos: Array<{ id: string; title: string; channel: string; thumbnail: string }>; warning: string | null }> {
  if (!env.YOUTUBE_API_KEY) return { videos: [], warning: "YouTube is not configured." }
  const key = location.trim().toLowerCase()
  try {
    return await cached(`yt:12:${key}`, 12 * 60 * 60 * 1000, async () => {
      const url = new URL("https://www.googleapis.com/youtube/v3/search")
      url.searchParams.set("part", "snippet")
      url.searchParams.set("type", "video")
      url.searchParams.set("maxResults", "12")
      url.searchParams.set("q", `${location} travel`)
      url.searchParams.set("key", env.YOUTUBE_API_KEY)
      const data = await getJson<{
        items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; thumbnails?: { medium?: { url?: string }; high?: { url?: string } } } }>
      }>(url.toString())
      const videos = (data.items ?? [])
        .map((item) => ({
          id: item.id?.videoId || "",
          title: item.snippet?.title || "Untitled video",
          channel: item.snippet?.channelTitle || "",
          thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || "",
        }))
        .filter((item) => item.id)
      return { videos, warning: videos.length ? null : "No videos found for this place." }
    })
  } catch (error) {
    console.error("YouTube lookup failed", key, error)
    return { videos: [], warning: "Videos are unavailable right now." }
  }
}
