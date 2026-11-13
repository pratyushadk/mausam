import PDFDocument from "pdfkit"
import { toCsv } from "../lib/csv"
import { weatherLabel } from "../lib/weatherCodes"
import type { DailyPoint } from "../types"

type ExportSearch = {
  id: string
  title: string
  notes: string
  startDate: string
  endDate: string
  location: { name: string; country: string | null; adminRegion: string | null; latitude: number; longitude: number }
  daily: DailyPoint[]
  attribution: string
  retrievedAt: string
  units: { temperature: string; wind: string; precipitation: string }
}

function flatRows(searches: ExportSearch[]) {
  return searches.flatMap((search) =>
    search.daily.map((day) => ({
      search_id: search.id,
      title: search.title,
      notes: search.notes,
      location_name: search.location.name,
      country: search.location.country,
      admin_region: search.location.adminRegion,
      latitude: search.location.latitude,
      longitude: search.location.longitude,
      start_date: search.startDate,
      end_date: search.endDate,
      observation_date: day.date,
      kind: day.kind,
      meaning: day.meaning,
      temperature_max: day.temperatureMax,
      temperature_min: day.temperatureMin,
      temperature_mean: day.temperatureMean,
      apparent_temperature_max: day.apparentTemperatureMax,
      precipitation_sum: day.precipitationSum,
      wind_speed_max: day.windSpeedMax,
      wind_direction: day.windDirection,
      weather_code: day.weatherCode,
      condition: weatherLabel(day.weatherCode),
      uv_index_max: day.uvIndexMax,
      temperature_unit: search.units.temperature,
      wind_unit: search.units.wind,
      precipitation_unit: search.units.precipitation,
      source: day.source,
      retrieved_at: search.retrievedAt,
      attribution: search.attribution,
    })),
  )
}

function pdfBuffer(searches: ExportSearch[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "A4" })
    const chunks: Buffer[] = []
    doc.on("data", (chunk) => chunks.push(chunk as Buffer))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)
    doc.fontSize(18).text("Mausam weather export")
    doc.moveDown(0.5)
    doc.fontSize(10).text("Saved daily weather from this browser. Values use the units stored with each search.")
    for (const search of searches) {
      doc.moveDown()
      doc.fontSize(14).text(search.title)
      doc.fontSize(10).text(`${search.location.name}${search.location.country ? `, ${search.location.country}` : ""}`)
      doc.text(`${search.location.latitude}, ${search.location.longitude}`)
      doc.text(`${search.startDate} to ${search.endDate}`)
      doc.text(`Retrieved ${search.retrievedAt}`)
      if (search.notes) doc.text(search.notes)
      for (const day of search.daily) {
        doc.moveDown(0.4)
        doc.fontSize(11).text(`${day.date} · ${day.meaning}`)
        doc.fontSize(10).text(
          `High ${show(day.temperatureMax)} °C · Low ${show(day.temperatureMin)} °C · Average ${show(day.temperatureMean)} °C`,
        )
        doc.text(`Precipitation ${show(day.precipitationSum)} mm · Wind ${show(day.windSpeedMax)} km/h · ${weatherLabel(day.weatherCode)}`)
        doc.text(`Source ${day.source}`)
      }
    }
    doc.moveDown()
    doc.fontSize(9).text("Weather data by Open-Meteo.com", { link: "https://open-meteo.com/", underline: true })
    doc.end()
  })
}

function show(value: number | null) {
  return value == null ? "Not available" : String(value)
}

export async function renderExport(format: "csv" | "json" | "pdf", searches: ExportSearch[]) {
  if (format === "json") {
    return {
      body: Buffer.from(JSON.stringify({ searches }, null, 2)),
      type: "application/json",
      filename: "mausam.json",
    }
  }
  if (format === "pdf") {
    return { body: await pdfBuffer(searches), type: "application/pdf", filename: "mausam.pdf" }
  }
  const rows = flatRows(searches)
  return { body: Buffer.from(toCsv(rows)), type: "text/csv; charset=utf-8", filename: "mausam.csv" }
}
