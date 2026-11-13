import type { Metadata } from "next"
import { DM_Sans } from "next/font/google"
import { Shell } from "@/components/Shell"
import "./globals.css"

const dm = DM_Sans({ subsets: ["latin"], variable: "--font-dm" })

export const metadata: Metadata = {
  title: "Mausam",
  description: "Search weather, save it, and export it.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${dm.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full" suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("mausam-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}
