import { z } from "zod"

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  FRONTEND_ORIGIN: z.string().default("http://localhost:3000"),
  YOUTUBE_API_KEY: z.string().optional().default(""),
  OPEN_METEO_FORECAST_URL: z.string().default("https://api.open-meteo.com/v1/forecast"),
  OPEN_METEO_ARCHIVE_URL: z.string().default("https://archive-api.open-meteo.com/v1/archive"),
  OPEN_METEO_GEOCODING_URL: z.string().default("https://geocoding-api.open-meteo.com/v1/search"),
  OPEN_METEO_AIR_QUALITY_URL: z.string().default("https://air-quality-api.open-meteo.com/v1/air-quality"),
  NOMINATIM_BASE_URL: z.string().default("https://nominatim.openstreetmap.org"),
})

export const env = schema.parse(process.env)
