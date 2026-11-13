import type { Prisma, Search } from "@prisma/client"
import { prisma } from "../db"
import { ApiError } from "../lib/errors"
import { dayMeaning, fromDbDate, toDbDate, validateRange } from "../lib/dates"
import { resolvePlace } from "./geocode"
import { buildNotices, fetchAir, fetchOfficialAlerts } from "./extras"
import { fetchWeather } from "./weather"
import { ATTRIBUTION, UNITS, type AirQuality, type DailyPoint, type Place, type Snapshot } from "../types"

const searchInclude = { observations: { orderBy: { observationDate: "asc" as const } } }

type SavedSearch = Prisma.SearchGetPayload<{ include: typeof searchInclude }>

function defaultTitle(name: string, start: string, end: string) {
  return `${name} · ${start} to ${end}`
}

export function toWeather(search: SavedSearch) {
  const snapshot = search.snapshot as unknown as Snapshot
  const daily: DailyPoint[] = search.observations.map((row) => ({
    date: fromDbDate(row.observationDate),
    kind: row.kind as DailyPoint["kind"],
    meaning: dayMeaning(row.kind, row.source),
    temperatureMax: row.temperatureMax,
    temperatureMin: row.temperatureMin,
    temperatureMean: row.temperatureMean,
    apparentTemperatureMax: row.apparentTemperatureMax,
    precipitationSum: row.precipitationSum,
    windSpeedMax: row.windSpeedMax,
    windDirection: row.windDirection,
    weatherCode: row.weatherCode,
    uvIndexMax: row.uvIndexMax,
    source: row.source,
  }))
  return {
    id: search.id,
    persisted: true,
    query: search.queryText,
    title: search.title,
    notes: search.notes,
    startDate: fromDbDate(search.startDate),
    endDate: fromDbDate(search.endDate),
    location: {
      name: search.locationName,
      country: search.country,
      adminRegion: search.adminRegion,
      latitude: search.latitude,
      longitude: search.longitude,
      timezone: search.timezone,
    } satisfies Place,
    current: snapshot.current,
    hourly: snapshot.hourly,
    forecast: snapshot.forecast,
    daily,
    airQuality: (search.airQuality as AirQuality | null) ?? null,
    notices: snapshot.notices ?? [],
    officialAlerts: snapshot.officialAlerts ?? [],
    attribution: ATTRIBUTION,
    retrievedAt: search.retrievedAt.toISOString(),
    units: UNITS,
  }
}

async function loadWeather(input: {
  query?: string
  latitude?: number
  longitude?: number
  name?: string
  country?: string | null
  adminRegion?: string | null
  timezone?: string | null
  startDate: string
  endDate: string
}) {
  validateRange(input.startDate, input.endDate)
  const location = await resolvePlace(input)
  const weather = await fetchWeather(location.latitude, location.longitude, input.startDate, input.endDate)
  if (weather.daily.length === 0) {
    throw new ApiError(422, "WEATHER_UNAVAILABLE", "No weather data is available for those dates.")
  }
  const [airQuality, officialAlerts] = await Promise.all([
    fetchAir(location.latitude, location.longitude),
    fetchOfficialAlerts(location.latitude, location.longitude),
  ])
  const notices = buildNotices(weather.current, weather.daily, airQuality)
  const snapshot: Snapshot = {
    current: weather.current,
    hourly: weather.hourly,
    forecast: weather.forecast,
    notices,
    officialAlerts,
  }
  return { location: { ...location, timezone: location.timezone ?? weather.timezone }, weather, airQuality, snapshot }
}

function observationRows(searchId: string, daily: DailyPoint[]) {
  return daily.map((day) => ({
    searchId,
    observationDate: toDbDate(day.date),
    kind: day.kind,
    temperatureMax: day.temperatureMax,
    temperatureMin: day.temperatureMin,
    temperatureMean: day.temperatureMean,
    apparentTemperatureMax: day.apparentTemperatureMax,
    precipitationSum: day.precipitationSum,
    windSpeedMax: day.windSpeedMax,
    windDirection: day.windDirection,
    weatherCode: day.weatherCode,
    uvIndexMax: day.uvIndexMax,
    source: day.source,
  }))
}

export async function createSearch(clientId: string, input: {
  query?: string
  latitude?: number
  longitude?: number
  name?: string
  country?: string | null
  adminRegion?: string | null
  timezone?: string | null
  startDate: string
  endDate: string
  title?: string
  notes?: string
}) {
  const loaded = await loadWeather(input)
  const title = input.title?.trim() || defaultTitle(loaded.location.name, input.startDate, input.endDate)
  try {
    const saved = await prisma.$transaction(async (tx) => {
      const search = await tx.search.create({
        data: {
          clientId,
          queryText: input.query?.trim() || loaded.location.name,
          title,
          notes: input.notes?.trim() || "",
          locationName: loaded.location.name,
          country: loaded.location.country,
          adminRegion: loaded.location.adminRegion,
          latitude: loaded.location.latitude,
          longitude: loaded.location.longitude,
          timezone: loaded.location.timezone,
          startDate: toDbDate(input.startDate),
          endDate: toDbDate(input.endDate),
          units: UNITS,
          snapshot: loaded.snapshot,
          airQuality: loaded.airQuality ?? undefined,
          retrievedAt: new Date(),
        },
      })
      await tx.observation.createMany({ data: observationRows(search.id, loaded.weather.daily) })
      return tx.search.findUniqueOrThrow({ where: { id: search.id }, include: searchInclude })
    })
    return toWeather(saved)
  } catch (error) {
    if (error instanceof ApiError) throw error
    console.error(error)
    throw new ApiError(500, "SAVE_FAILED", "Weather was retrieved but could not be saved.", {
      persisted: false,
      weather: {
        persisted: false,
        query: input.query ?? loaded.location.name,
        title,
        notes: input.notes ?? "",
        startDate: input.startDate,
        endDate: input.endDate,
        location: loaded.location,
        ...loaded.snapshot,
        daily: loaded.weather.daily,
        airQuality: loaded.airQuality,
        attribution: ATTRIBUTION,
        retrievedAt: new Date().toISOString(),
        units: UNITS,
      },
    })
  }
}

async function owned(clientId: string, id: string) {
  const search = await prisma.search.findFirst({ where: { id, clientId }, include: searchInclude })
  if (!search) throw new ApiError(404, "NOT_FOUND", "Record not found.")
  return search
}

export async function listSearches(clientId: string, query: { location?: string; from?: string; to?: string; page: number; pageSize: number }) {
  const where: Prisma.SearchWhereInput = { clientId }
  if (query.location) where.locationName = { contains: query.location, mode: "insensitive" }
  if (query.from) where.endDate = { gte: toDbDate(query.from) }
  if (query.to) where.startDate = { lte: toDbDate(query.to) }
  const [total, rows] = await Promise.all([
    prisma.search.count({ where }),
    prisma.search.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ])
  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    items: rows.map(summary),
  }
}

export function summary(search: Search) {
  return {
    id: search.id,
    title: search.title,
    notes: search.notes,
    locationName: search.locationName,
    country: search.country,
    adminRegion: search.adminRegion,
    latitude: search.latitude,
    longitude: search.longitude,
    startDate: fromDbDate(search.startDate),
    endDate: fromDbDate(search.endDate),
    retrievedAt: search.retrievedAt.toISOString(),
    createdAt: search.createdAt.toISOString(),
  }
}

export async function getSearch(clientId: string, id: string) {
  return toWeather(await owned(clientId, id))
}

export async function updateSearch(clientId: string, id: string, input: {
  title?: string
  notes?: string
  query?: string
  latitude?: number
  longitude?: number
  name?: string
  country?: string | null
  adminRegion?: string | null
  timezone?: string | null
  startDate?: string
  endDate?: string
}) {
  const current = await owned(clientId, id)
  const changesPlace = input.query != null || input.latitude != null || input.longitude != null || input.startDate != null || input.endDate != null
  if (!changesPlace) {
    const saved = await prisma.search.update({
      where: { id },
      data: {
        ...(input.title != null ? { title: input.title.trim() || current.title } : {}),
        ...(input.notes != null ? { notes: input.notes.trim() } : {}),
      },
      include: searchInclude,
    })
    return toWeather(saved)
  }

  const startDate = input.startDate ?? fromDbDate(current.startDate)
  const endDate = input.endDate ?? fromDbDate(current.endDate)
  const keepsPlace = input.query == null && input.latitude == null && input.longitude == null
  const loaded = await loadWeather({
    query: input.query,
    name: input.name ?? (keepsPlace ? current.locationName : undefined),
    country: input.country ?? (keepsPlace ? current.country : undefined),
    adminRegion: input.adminRegion ?? (keepsPlace ? current.adminRegion : undefined),
    timezone: input.timezone ?? (keepsPlace ? current.timezone : undefined),
    latitude: input.latitude ?? (keepsPlace ? current.latitude : undefined),
    longitude: input.longitude ?? (keepsPlace ? current.longitude : undefined),
    startDate,
    endDate,
  })
  const saved = await prisma.$transaction(async (tx) => {
    await tx.observation.deleteMany({ where: { searchId: id } })
    await tx.search.update({
      where: { id },
      data: {
        queryText: input.query?.trim() || loaded.location.name,
        title: input.title?.trim() || defaultTitle(loaded.location.name, startDate, endDate),
        notes: input.notes != null ? input.notes.trim() : current.notes,
        locationName: loaded.location.name,
        country: loaded.location.country,
        adminRegion: loaded.location.adminRegion,
        latitude: loaded.location.latitude,
        longitude: loaded.location.longitude,
        timezone: loaded.location.timezone,
        startDate: toDbDate(startDate),
        endDate: toDbDate(endDate),
        snapshot: loaded.snapshot,
        airQuality: loaded.airQuality ?? undefined,
        retrievedAt: new Date(),
      },
    })
    await tx.observation.createMany({ data: observationRows(id, loaded.weather.daily) })
    return tx.search.findUniqueOrThrow({ where: { id }, include: searchInclude })
  })
  return toWeather(saved)
}

export async function refreshSearch(clientId: string, id: string) {
  const current = await owned(clientId, id)
  return updateSearch(clientId, id, {
    latitude: current.latitude,
    longitude: current.longitude,
    name: current.locationName,
    country: current.country,
    adminRegion: current.adminRegion,
    timezone: current.timezone,
    startDate: fromDbDate(current.startDate),
    endDate: fromDbDate(current.endDate),
    title: current.title,
    notes: current.notes,
  })
}

export async function deleteSearch(clientId: string, id: string) {
  await owned(clientId, id)
  await prisma.search.delete({ where: { id } })
}

export async function searchesForExport(clientId: string, filter: { ids?: string[]; location?: string; from?: string; to?: string }) {
  const where: Prisma.SearchWhereInput = { clientId }
  if (filter.ids) where.id = { in: filter.ids }
  if (filter.location) where.locationName = { contains: filter.location, mode: "insensitive" }
  if (filter.from) where.endDate = { gte: toDbDate(filter.from) }
  if (filter.to) where.startDate = { lte: toDbDate(filter.to) }
  const rows = await prisma.search.findMany({ where, include: searchInclude, orderBy: { createdAt: "desc" } })
  if (rows.length === 0) throw new ApiError(404, "NOT_FOUND", "No saved searches match this export.")
  return rows.map(toWeather)
}
