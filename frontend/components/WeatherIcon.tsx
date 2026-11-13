import { iconName } from "@/lib/format"

function Sun() {
  return (
    <g>
      <circle cx="32" cy="32" r="9" fill="#ffb703" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <line key={angle} x1="32" y1="14" x2="32" y2="8" stroke="#ffb703" strokeWidth="3" strokeLinecap="round" transform={`rotate(${angle} 32 32)`} />
      ))}
    </g>
  )
}

function Cloud({ x = 34, y = 36, fill = "#f8fafc", shade = "#cbd5e1" }: { x?: number; y?: number; fill?: string; shade?: string }) {
  return (
    <g>
      <ellipse cx={x + 2} cy={y + 4} rx="16" ry="10" fill={shade} />
      <ellipse cx={x - 6} cy={y + 2} rx="8" ry="8" fill={fill} />
      <ellipse cx={x + 4} cy={y - 2} rx="10" ry="9" fill={fill} />
      <ellipse cx={x + 8} cy={y + 3} rx="12" ry="8" fill={fill} />
    </g>
  )
}

export function WeatherIcon({ code, className = "h-14 w-14" }: { code: number | null; className?: string }) {
  const name = iconName(code)
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {name === "clear" && <Sun />}
      {name === "partly" && (
        <>
          <g transform="translate(8 -6) scale(0.72)"><Sun /></g>
          <Cloud />
        </>
      )}
      {name === "cloud" && <Cloud x={32} y={34} />}
      {name === "fog" && (
        <>
          <Cloud x={32} y={26} />
          <rect x="14" y="42" width="36" height="3" rx="1.5" fill="#94a3b8" />
          <rect x="18" y="49" width="28" height="3" rx="1.5" fill="#cbd5e1" />
        </>
      )}
      {name === "rain" && (
        <>
          <Cloud x={32} y={26} fill="#e2e8f0" shade="#94a3b8" />
          <path d="M22 46 v8 M32 48 v8 M42 46 v8" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {name === "snow" && (
        <>
          <Cloud x={32} y={24} />
          {["24,48", "32,52", "42,47"].map((point) => (
            <g key={point} transform={`translate(${point})`}>
              <path d="M0 -5 V5 M-4 -3 L4 3 M-4 3 L4 -3" stroke="#e0f2fe" strokeWidth="1.6" strokeLinecap="round" />
            </g>
          ))}
        </>
      )}
      {name === "storm" && (
        <>
          <Cloud x={32} y={24} fill="#cbd5e1" shade="#64748b" />
          <path d="M34 34 L24 46 h8 l-4 12 14-16 h-8 z" fill="#fbbf24" />
        </>
      )}
    </svg>
  )
}

export function WeatherScene({ code }: { code: number | null }) {
  const name = iconName(code)
  if (name === "clear" || name === "partly") {
    return <div className="pointer-events-none absolute -right-6 -top-10 h-36 w-36 rounded-full bg-amber-300/30 blur-2xl" />
  }
  if (name === "rain" || name === "storm") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 14 }, (_, index) => (
          <span
            key={index}
            className="absolute top-0 h-8 w-px bg-sky-200/50"
            style={{ left: `${6 + index * 7}%`, animation: `rain-fall ${0.8 + (index % 4) * 0.2}s linear ${index * 0.12}s infinite` }}
          />
        ))}
      </div>
    )
  }
  if (name === "snow") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 12 }, (_, index) => (
          <span
            key={index}
            className="absolute top-0 h-1.5 w-1.5 rounded-full bg-white/70"
            style={{ left: `${8 + index * 8}%`, animation: `snow-fall ${2 + (index % 3) * 0.6}s linear ${index * 0.2}s infinite` }}
          />
        ))}
      </div>
    )
  }
  return (
    <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-around opacity-30">
      <span className="h-10 w-24 rounded-full bg-white/40 blur-md" style={{ animation: "cloud-drift 9s ease-in-out infinite alternate" }} />
      <span className="mt-4 h-8 w-20 rounded-full bg-white/30 blur-md" style={{ animation: "cloud-drift 12s ease-in-out infinite alternate-reverse" }} />
    </div>
  )
}
