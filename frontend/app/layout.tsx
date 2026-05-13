import type { Metadata } from "next"
import { Manrope, Sora, Geist } from "next/font/google"
import "./globals.css"
import { AppToaster } from "@/components/map/app-toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
})

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
})

export const metadata: Metadata = {
  title: "MAP",
  description: "Medicine Access Platform",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={cn("font-sans", geist.variable)}
    >
      <body className={`${manrope.variable} ${sora.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            {children}
            <AppToaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
