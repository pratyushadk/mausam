-- CreateTable
CREATE TABLE "searches" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "query_text" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "location_name" TEXT NOT NULL,
    "country" TEXT,
    "admin_region" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timezone" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'open-meteo',
    "units" JSONB NOT NULL,
    "snapshot" JSONB NOT NULL,
    "air_quality" JSONB,
    "retrieved_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observations" (
    "id" TEXT NOT NULL,
    "search_id" TEXT NOT NULL,
    "observation_date" DATE NOT NULL,
    "kind" TEXT NOT NULL,
    "temperature_max" DOUBLE PRECISION,
    "temperature_min" DOUBLE PRECISION,
    "temperature_mean" DOUBLE PRECISION,
    "apparent_temperature_max" DOUBLE PRECISION,
    "precipitation_sum" DOUBLE PRECISION,
    "wind_speed_max" DOUBLE PRECISION,
    "wind_direction" DOUBLE PRECISION,
    "weather_code" INTEGER,
    "uv_index_max" DOUBLE PRECISION,
    "source" TEXT NOT NULL,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "searches_client_id_created_at_idx" ON "searches"("client_id", "created_at");

-- CreateIndex
CREATE INDEX "searches_client_id_location_name_idx" ON "searches"("client_id", "location_name");

-- CreateIndex
CREATE INDEX "searches_start_date_end_date_idx" ON "searches"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "observations_search_id_idx" ON "observations"("search_id");

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_search_id_fkey" FOREIGN KEY ("search_id") REFERENCES "searches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "searches" ADD CONSTRAINT "searches_latitude_check" CHECK ("latitude" >= -90 AND "latitude" <= 90);
ALTER TABLE "searches" ADD CONSTRAINT "searches_longitude_check" CHECK ("longitude" >= -180 AND "longitude" <= 180);
ALTER TABLE "searches" ADD CONSTRAINT "searches_date_order_check" CHECK ("start_date" <= "end_date");
ALTER TABLE "observations" ADD CONSTRAINT "observations_kind_check" CHECK ("kind" IN ('historical', 'current', 'forecast'));
