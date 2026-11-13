import cors from "cors"
import express from "express"
import rateLimit from "express-rate-limit"
import helmet from "helmet"
import { env } from "./env"
import { errorHandler } from "./lib/errors"
import { router } from "./routes"

export function createApp() {
  const app = express()
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }))
  app.use(cors({ origin: env.FRONTEND_ORIGIN, allowedHeaders: ["Content-Type", "X-Client-Id"] }))
  app.use(express.json({ limit: "1mb" }))
  app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }))
  app.use("/api", router)
  app.use(errorHandler)
  return app
}
