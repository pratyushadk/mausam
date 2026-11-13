import { Router } from "express"
import { z } from "zod"
import { prisma } from "./db"
import { ApiError } from "./lib/errors"
import { isIsoDate } from "./lib/dates"
import { searchPlaces } from "./services/geocode"
import { renderExport } from "./services/export"
import { searchVideos } from "./services/extras"
import { createSearch, deleteSearch, getSearch, listSearches, refreshSearch, searchesForExport, updateSearch } from "./services/searches"

export const router = Router()

const wrap = (handler: (req: import("express").Request, res: import("express").Response) => Promise<unknown>) =>
  (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
    handler(req, res).catch(next)
  }

const clientSchema = z.string().uuid()

function clientId(req: import("express").Request) {
  const parsed = clientSchema.safeParse(req.header("x-client-id"))
  if (!parsed.success) throw new ApiError(400, "CLIENT_ID_REQUIRED", "This browser is missing its id. Reload the page.")
  return parsed.data
}

const placeFields = {
  query: z.string().trim().max(200).optional(),
  latitude: z.number().gte(-90).lte(90).optional(),
  longitude: z.number().gte(-180).lte(180).optional(),
  name: z.string().trim().max(200).optional(),
  country: z.string().trim().max(120).nullable().optional(),
  adminRegion: z.string().trim().max(120).nullable().optional(),
  timezone: z.string().trim().max(80).nullable().optional(),
}

const createSchema = z.object({
  ...placeFields,
  startDate: z.string(),
  endDate: z.string(),
  title: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
}).strict()

const patchSchema = z.object({
  ...placeFields,
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  title: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
}).strict()

router.get("/health", (_req, res) => {
  res.json({ ok: true })
})

router.get("/health/ready", wrap(async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`
  res.json({ ok: true, database: true })
}))

router.get("/locations/search", wrap(async (req, res) => {
  const query = z.string().trim().min(2).max(200).parse(req.query.q)
  const places = await searchPlaces(query)
  res.json({ places })
}))

router.post("/searches", wrap(async (req, res) => {
  const body = createSchema.parse(req.body)
  const saved = await createSearch(clientId(req), body)
  res.status(201).json(saved)
}))

router.get("/searches", wrap(async (req, res) => {
  const query = z.object({
    location: z.string().trim().max(200).optional(),
    from: z.string().refine((value) => !value || isIsoDate(value)).optional(),
    to: z.string().refine((value) => !value || isIsoDate(value)).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }).parse(req.query)
  res.json(await listSearches(clientId(req), query))
}))

router.get("/searches/:id", wrap(async (req, res) => {
  res.json(await getSearch(clientId(req), z.string().uuid().parse(req.params.id)))
}))

router.patch("/searches/:id", wrap(async (req, res) => {
  const body = patchSchema.parse(req.body)
  res.json(await updateSearch(clientId(req), z.string().uuid().parse(req.params.id), body))
}))

router.post("/searches/:id/refresh", wrap(async (req, res) => {
  res.json(await refreshSearch(clientId(req), z.string().uuid().parse(req.params.id)))
}))

router.delete("/searches/:id", wrap(async (req, res) => {
  await deleteSearch(clientId(req), z.string().uuid().parse(req.params.id))
  res.status(204).send()
}))

router.get("/exports", wrap(async (req, res) => {
  const query = z.object({
    format: z.enum(["csv", "json", "pdf"]),
    scope: z.enum(["one", "selected", "filter", "all"]),
    id: z.string().uuid().optional(),
    ids: z.string().optional(),
    location: z.string().trim().max(200).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }).parse(req.query)
  if (query.from && !isIsoDate(query.from)) throw new ApiError(422, "DATE_RANGE_INVALID", "Enter dates as YYYY-MM-DD.")
  if (query.to && !isIsoDate(query.to)) throw new ApiError(422, "DATE_RANGE_INVALID", "Enter dates as YYYY-MM-DD.")

  let ids: string[] | undefined
  if (query.scope === "one") {
    if (!query.id) throw new ApiError(422, "VALIDATION", "Choose a search to export.")
    ids = [query.id]
  }
  if (query.scope === "selected") {
    ids = (query.ids ?? "").split(",").map((item) => item.trim()).filter(Boolean)
    if (ids.length === 0 || ids.some((id) => !z.string().uuid().safeParse(id).success)) {
      throw new ApiError(422, "VALIDATION", "Choose at least one saved search.")
    }
  }
  const searches = await searchesForExport(clientId(req), {
    ids,
    location: query.scope === "filter" ? query.location : undefined,
    from: query.scope === "filter" ? query.from : undefined,
    to: query.scope === "filter" ? query.to : undefined,
  })
  const file = await renderExport(query.format, searches)
  res.setHeader("Content-Type", file.type)
  res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`)
  res.send(file.body)
}))

router.get("/videos", wrap(async (req, res) => {
  const location = z.string().trim().min(2).max(200).parse(req.query.location)
  res.json(await searchVideos(location))
}))
