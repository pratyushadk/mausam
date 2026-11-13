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
          <footer className="border-t border-slate-200 px-5 py-4 text-base text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Mausam · Pratyush
          </footer>
        </div>
      </div>
    </PrefsProvider>
  )
}
