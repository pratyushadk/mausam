"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { PrefsProvider } from "@/lib/prefs"
import logoDark from "../logo_darkmode.png"
import logoLight from "../logo_lightmode.png"

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/explore", label: "Explore" },
  { href: "/history", label: "Weather History" },
  { href: "/locations", label: "Saved Locations" },
  { href: "/settings", label: "Settings" },
]

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <PrefsProvider>
      <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
        <aside className="border-b border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#101827] md:border-b-0 md:border-r md:py-5">
          <Link href="/" className="block w-fit max-w-full">
            <Image src={logoLight} alt="Mausam" priority className="h-14 w-auto max-w-[12rem] dark:hidden md:h-16 md:max-w-full" />
            <Image src={logoDark} alt="" priority className="hidden h-14 w-auto max-w-[12rem] dark:block md:h-16 md:max-w-full" />
          </Link>
          <nav className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:mt-8 md:grid-cols-1">
            {links.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-xl px-4 py-3 text-center text-base transition duration-200 md:text-left ${active ? "bg-[#1a5278] text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"}`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-col">
          <main className="w-full min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
          <footer className="border-t border-slate-200 px-5 py-5 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-base text-slate-700 dark:text-slate-200">Mausam · Pratyush Adhikari</p>
                <p className="mt-1 leading-6">
                  Product Manager Accelerator supports product managers through every stage of their career, from students looking for a first role to directors taking on leadership, with coaching, training, and hands-on programs.
                </p>
              </div>
              <a
                href="https://www.linkedin.com/school/pmaccelerator/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-white/10"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
                  <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.73V1.73C24 .77 23.21 0 22.23 0z" />
                </svg>
                Product Manager Accelerator
              </a>
            </div>
          </footer>
        </div>
      </div>
    </PrefsProvider>
  )
}
