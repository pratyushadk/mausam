# Mausam

Mausam is a weather workspace. You search a place and a date range, see current conditions and a five-day forecast, and the result is saved for this browser. You can edit, refresh, delete, and export those saved searches.

Built by Pratyush for the PM Accelerator technical assessment.

## How it fits together

The Next.js app in `frontend` calls the Express API in `backend`. The API validates the request, asks Open-Meteo for weather, and stores the search in Supabase PostgreSQL through Prisma. Map tiles and radar images load in the browser. The YouTube key stays on the server.

There is no login. The first visit stores a random id in the browser. History, edits, deletes, and exports use that id, so one browser cannot read another browser's searches.

## Date limits

- A past search, including one that ends today, can cover 31 days.
- A search that includes a future day can cover 16 days, and it cannot end after the 16-day forecast window.
- Historical data can start on 1940-01-01.

## Export

CSV, JSON, and PDF are built from saved rows. They include the place, dates, daily temperatures, precipitation, wind, condition, units, source, and retrieval time. They do not include maps, radar, or videos.

## Run it locally

1. Create a Supabase project and copy the Postgres connection strings.
2. In `backend`, copy `.env.example` to `.env` and fill in `DATABASE_URL`, `DIRECT_URL`, and `FRONTEND_ORIGIN`. Add `YOUTUBE_API_KEY` when you want location videos.
3. Apply the schema:

```bash
cd backend
npm install
npx prisma migrate deploy
npm run dev
```

4. Start the site:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. The API listens on http://localhost:4000.

## Deploy

- Frontend: Vercel, with root directory `code/frontend` and `NEXT_PUBLIC_API_BASE_URL` set to the Render URL.
- Backend: Render, with root directory `code/backend`. Build command: `npm install && npx prisma migrate deploy && npm run build`. Start command: `npm start`.
- Database: Supabase. Put the pooled URL in `DATABASE_URL` and the session or direct URL in `DIRECT_URL`.

Set `FRONTEND_ORIGIN` to the exact Vercel origin after the first frontend deploy.

## Checks

```bash
cd backend
npm test
npm run build
```

Weather data by [Open-Meteo](https://open-meteo.com/). Map tiles © OpenStreetMap contributors. Radar by [RainViewer](https://www.rainviewer.com/).
