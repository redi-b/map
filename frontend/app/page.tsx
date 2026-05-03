import { ArrowRightIcon, BotIcon, ClipboardCheckIcon, MapPinIcon, ShieldCheckIcon } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: MapPinIcon,
    title: "Find medicine faster",
    description: "Search verified pharmacy stock by medicine, neighborhood, delivery, and price.",
  },
  {
    icon: ClipboardCheckIcon,
    title: "Track prescription review",
    description: "Upload once, follow review status, pickup, delivery, and pharmacy responses.",
  },
  {
    icon: BotIcon,
    title: "Ask safely",
    description: "Get medication information with clear disclaimers and nearby pharmacy context.",
  },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-3 font-[var(--font-display)] font-semibold">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheckIcon className="size-5" />
          </span>
          MAP
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" render={<Link href="/login" />}>
            Sign in
          </Button>
          <Button render={<Link href="/register" />}>
            Create account
          </Button>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:py-20">
        <div className="flex flex-col justify-center gap-6">
          <Badge variant="secondary" className="w-fit">Addis Ababa medicine access</Badge>
          <div className="flex flex-col gap-4">
            <h1 className="max-w-4xl font-[var(--font-display)] text-5xl font-semibold tracking-normal md:text-7xl">
              Medicine access that knows the pharmacy shelf.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              MAP connects patients, pharmacies, and administrators around verified stock, prescription review, adherence reminders, and safer medicine guidance.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" render={<Link href="/register" />}>
              Start now
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/login" />}>
              I already have an account
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="grid gap-4">
            <div className="rounded-lg bg-secondary p-5">
              <p className="text-sm text-muted-foreground">Live stock request</p>
              <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold">Amoxicillin 500mg</h2>
              <div className="mt-5 grid gap-3">
                {["Lion Pharmacy, Bole", "Wudassie Pharmacy, Kazanchis", "HealthPlus, Piazza"].map((item, index) => (
                  <div key={item} className="flex items-center justify-between rounded-lg bg-background p-3">
                    <span>{item}</span>
                    <Badge variant={index === 1 ? "secondary" : "default"}>{index === 1 ? "Low" : "In stock"}</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title}>
                  <CardHeader>
                    <feature.icon className="size-5 text-primary" />
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
