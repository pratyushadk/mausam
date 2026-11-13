export type Place = {
  name: string
  country: string | null
  adminRegion: string | null
  latitude: number
  longitude: number
  timezone: string | null
}

export type DailyPoint = {
  date: string
  kind: "historical" | "current" | "forecast"
  meaning: string
  temperatureMax: number | null
  temperatureMin: number | null
  temperatureMean: number | null
  apparentTemperatureMax: number | null
  precipitationSum: number | null
  windSpeedMax: number | null
  windDirection: number | null
  weatherCode: number | null
  uvIndexMax: number | null
  source: string
}

export type CurrentWeather = {
  time: string | null
  temperature: number | null
  apparentTemperature: number | null
  humidity: number | null
  windSpeed: number | null
  windDirection: number | null
  precipitation: number | null
  weatherCode: number | null
  uvIndex: number | null
  label: string
}

export type HourlyPoint = {
  time: string
  temperature: number | null
  precipitation: number | null
  weatherCode: number | null
}

export type AirQuality = {
  time: string | null
  usAqi: number | null
  europeanAqi: number | null
  pm2_5: number | null
  pm10: number | null
  nitrogenDioxide: number | null
  ozone: number | null
}

export type Notice = { title: string; detail: string }
export type OfficialAlert = { event: string; headline: string; severity: string }

export type WeatherResult = {
  id?: string
  persisted: boolean
  query: string
  title: string
  notes: string
  startDate: string
  endDate: string
  location: Place
  current: CurrentWeather | null
  hourly: HourlyPoint[]
  forecast: DailyPoint[]
  daily: DailyPoint[]
  airQuality: AirQuality | null
  notices: Notice[]
  officialAlerts: OfficialAlert[]
  attribution: string
  retrievedAt: string
}

export type SearchSummary = {
  id: string
  title: string
  notes: string
  locationName: string
  country: string | null
  adminRegion: string | null
  latitude: number
  longitude: number
  startDate: string
  endDate: string
  retrievedAt: string
  createdAt: string
}
