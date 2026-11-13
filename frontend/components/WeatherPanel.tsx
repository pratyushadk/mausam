"use client"

import { useState } from "react"
import { compass, displayType, hourLabel, rain, shortDate, temperature, weatherLabel, wind } from "@/lib/format"
import { usePrefs } from "@/lib/prefs"
import type { DailyPoint, WeatherResult } from "@/lib/types"
import { WeatherIcon, WeatherScene } from "./WeatherIcon"

export function WeatherPanel({ weather }: { weather: WeatherResult }) {
  const { units } = usePrefs()
  const current = weather.current
  const pageSize = 6
  const [hourPage, setHourPage] = useState(0)
  const [hourIndex, setHourIndex] = useState(0)
  const [dayIndex, setDayIndex] = useState(0)
  const hourStart = hourPage * pageSize
  const visibleHours = weather.hourly.slice(hourStart, hourStart + pageSize)
  const hour = weather.hourly[hourIndex]
  const selectedDay = weather.forecast[dayIndex]
  const temps = visibleHours.map((item) => item.temperature).filter((value): value is number => value != null)
  const min = temps.length ? Math.min(...temps) : 0
  const max = temps.length ? Math.max(...temps) : 1
  const span = Math.max(max - min, 1)
  const lastPage = Math.max(Math.ceil(weather.hourly.length / pageSize) - 1, 0)

  function showPage(nextPage: number) {
    const page = Math.min(Math.max(nextPage, 0), lastPage)
    setHourPage(page)
    setHourIndex(page * pageSize)
  }

  return (
    <div key={weather.retrievedAt} className="rise space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1d6fa8] via-[#1a5278] to-[#16324f] p-6 text-white shadow-md sm:p-8">
        <WeatherScene code={current?.weatherCode ?? null} />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-sky-100">Live</p>
            <h2 className="mt-1 text-3xl font-semibold">
              {weather.location.name}
              {weather.location.country ? `, ${weather.location.country}` : ""}
            </h2>
            <p className="mt-1 text-sm text-sky-100">
              {shortDate(weather.startDate)} – {shortDate(weather.endDate)}
              {current?.time ? ` · ${current.time.replace("T", " ")}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <WeatherIcon code={current?.weatherCode ?? null} className="h-20 w-20 drop-shadow" />
            <div>
              <p className="text-5xl font-semibold tracking-tight">{temperature(current?.temperature ?? null, units)}</p>
              <p className="text-sky-100">{weatherLabel(current?.weatherCode ?? null)}</p>
            </div>
          </div>
        </div>
        <dl className="relative z-10 mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat label="Feels like" value={temperature(current?.apparentTemperature ?? null, units)} />
          <Stat label="Humidity" value={current?.humidity == null ? "—" : `${current.humidity}%`} />
          <Stat label="Wind" value={`${wind(current?.windSpeed ?? null, units)} ${compass(current?.windDirection ?? null)}`} />
          <Stat label="Rain" value={rain(current?.precipitation ?? null, units)} />
          <Stat label="UV" value={current?.uvIndex == null ? "—" : current.uvIndex.toFixed(1)} />
        </dl>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-end justify-between gap-3">
          <h3 className="font-semibold">Next hours</h3>
          {hour && <p className="text-sm text-slate-500">{hourLabel(hour.time)} · {temperature(hour.temperature, units)} · {weatherLabel(hour.weatherCode)}</p>}
        </div>
        {weather.hourly.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Hourly temperatures are not available.</p>
        ) : (
          <>
            <svg viewBox="0 0 480 120" className="mt-3 h-28 w-full" role="img" aria-label="Hourly temperature">
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3"
                points={visibleHours.map((item, index) => {
                  const x = (index / Math.max(visibleHours.length - 1, 1)) * 460 + 10
                  const y = 90 - (((item.temperature ?? min) - min) / span) * 70
                  return `${x},${y}`
                }).join(" ")}
              />
              {visibleHours.map((item, index) => {
                const selected = hourStart + index === hourIndex
                return (
                  <circle
                    key={item.time}
                    cx={(index / Math.max(visibleHours.length - 1, 1)) * 460 + 10}
                    cy={90 - (((item.temperature ?? min) - min) / span) * 70}
                    r={selected ? 6 : 3.5}
                    fill={selected ? "#0284c7" : "#7dd3fc"}
                  />
                )
              })}
            </svg>
            <div className="mt-3 flex items-center gap-2">
              <button type="button" aria-label="Previous hours" disabled={hourPage === 0} onClick={() => showPage(hourPage - 1)} className="rounded-full border border-slate-300 px-3 py-2 text-base disabled:opacity-40 dark:border-slate-600">‹</button>
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {visibleHours.map((item, index) => {
                  const actual = hourStart + index
                  return (
                    <button
                      key={item.time}
                      type="button"
                      onClick={() => setHourIndex(actual)}
                      className={`rounded-2xl border px-2 py-3 text-center text-sm transition ${actual === hourIndex ? "border-sky-700 bg-sky-700 text-white" : "border-slate-200 hover:border-sky-400 dark:border-slate-700"}`}
                    >
                      <WeatherIcon code={item.weatherCode} className="mx-auto h-8 w-8" />
                      <span className="mt-1 block">{hourLabel(item.time)}</span>
                      <span className="block font-medium">{temperature(item.temperature, units)}</span>
                    </button>
                  )
                })}
              </div>
              <button type="button" aria-label="Next hours" disabled={hourPage === lastPage} onClick={() => showPage(hourPage + 1)} className="rounded-full border border-slate-300 px-3 py-2 text-base disabled:opacity-40 dark:border-slate-600">›</button>
            </div>
          </>
        )}
      </section>

      <section>
        <h3 className="font-semibold">Five-day forecast</h3>
        <p className="text-sm text-slate-500">Select a day to see its details.</p>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {weather.forecast.map((day, index) => (
            <button
              key={day.date}
              type="button"
              onClick={() => setDayIndex(index)}
              className={`rounded-2xl border p-3 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md ${index === dayIndex ? "border-sky-600 bg-sky-50 dark:border-sky-400 dark:bg-slate-800" : "border-slate-200/80 bg-white dark:border-white/10 dark:bg-[#152033]"}`}
            >
              <p className="text-sm text-slate-500">{shortDate(day.date)}</p>
              <WeatherIcon code={day.weatherCode} />
              <p className="text-sm">{weatherLabel(day.weatherCode)}</p>
              <p className="mt-1 font-medium">{temperature(day.temperatureMax, units)} / {temperature(day.temperatureMin, units)}</p>
              <p className="text-xs text-slate-500">{displayType(day.kind)}</p>
            </button>
          ))}
        </div>
        {selectedDay && <DayDetail day={selectedDay} units={units} />}
      </section>

      <section className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="px-5 pt-5 font-semibold">Requested dates</h3>
        <table className="mt-2 w-full min-w-[720px] text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="px-5 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">High</th>
              <th className="px-3 py-2 font-medium">Low</th>
              <th className="px-3 py-2 font-medium">Rain</th>
              <th className="px-3 py-2 font-medium">Wind</th>
              <th className="px-5 py-2 font-medium">Condition</th>
            </tr>
          </thead>
          <tbody>
            {weather.daily.map((day) => (
              <tr key={day.date} className="border-t border-slate-100 hover:bg-sky-50 dark:border-slate-800 dark:hover:bg-slate-800">
                <td className="whitespace-nowrap px-5 py-2">{shortDate(day.date)}</td>
                <td className="whitespace-nowrap px-3 py-2">{displayType(day.kind)}</td>
                <td className="px-3 py-2">{temperature(day.temperatureMax, units)}</td>
                <td className="px-3 py-2">{temperature(day.temperatureMin, units)}</td>
                <td className="px-3 py-2">{rain(day.precipitationSum, units)}</td>
                <td className="px-3 py-2">{wind(day.windSpeedMax, units)}</td>
                <td className="px-5 py-2">{weatherLabel(day.weatherCode)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-semibold">Conditions to watch</h3>
          <p className="mt-1 text-sm text-slate-500">Calculated from the weather data. This is not a government warning.</p>
          {weather.notices.length === 0 ? <p className="mt-3 text-sm">Nothing unusual in this result.</p> : (
            <ul className="mt-3 space-y-2">
              {weather.notices.map((notice) => (
                <li key={notice.title} className="rounded-2xl bg-amber-50 px-3 py-2 dark:bg-amber-950/40">
                  <p className="font-medium">{notice.title}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{notice.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-semibold">U.S. National Weather Service</h3>
          {weather.officialAlerts.length === 0 ? <p className="mt-3 text-sm">No U.S. alert for this location.</p> : (
            <ul className="mt-3 space-y-2">
              {weather.officialAlerts.map((alert) => (
                <li key={alert.headline || alert.event}>
                  <p className="font-medium">{alert.event}</p>
                  <p className="text-sm text-slate-500">{alert.headline}</p>
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-5 font-semibold">Air quality</h3>
          <p className="mt-1 text-sm text-slate-500">Estimated air quality, not a roadside monitor.</p>
          {weather.airQuality ? (
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <StatDark label="US AQI" value={show(weather.airQuality.usAqi)} />
              <StatDark label="European AQI" value={show(weather.airQuality.europeanAqi)} />
              <StatDark label="PM2.5" value={show(weather.airQuality.pm2_5)} />
              <StatDark label="PM10" value={show(weather.airQuality.pm10)} />
            </div>
          ) : <p className="mt-2 text-sm">Air quality is not available for this request.</p>}
        </article>
      </section>
      <p className="text-sm text-slate-500">
        <a className="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">{weather.attribution}</a>
        {" · "}Retrieved {new Date(weather.retrievedAt).toLocaleString()}
      </p>
    </div>
  )
}

function DayDetail({ day, units }: { day: DailyPoint; units: "metric" | "imperial" }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-base dark:bg-slate-950 lg:grid-cols-4">
      <p><span className="text-slate-500">Day</span><br />{shortDate(day.date)} · {displayType(day.kind)}</p>
      <p><span className="text-slate-500">Temperature</span><br />{temperature(day.temperatureMax, units)} / {temperature(day.temperatureMin, units)}</p>
      <p><span className="text-slate-500">Rain</span><br />{rain(day.precipitationSum, units)}</p>
      <p><span className="text-slate-500">Wind</span><br />{wind(day.windSpeedMax, units)} {compass(day.windDirection)}</p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <dt className="text-xs text-sky-100">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  )
}

function StatDark({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}

function show(value: number | null) {
  return value == null ? "—" : String(value)
}
