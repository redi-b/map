import {
  ArrowRightIcon,
  BellIcon,
  BotIcon,
  Building2Icon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  Clock3Icon,
  HeartPulseIcon,
  MapPinIcon,
  PackageSearchIcon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react"
import Link from "next/link"
import { LandingAuthActions } from "@/components/map/landing-auth-actions"
import { PublicNav } from "@/components/map/public-nav"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const features = [
  {
    icon: MapPinIcon,
    title: "Search nearby stock",
    description: "Compare stocked pharmacies by medicine name, distance, pickup, delivery, price, and expiry guidance.",
  },
  {
    icon: ClipboardCheckIcon,
    title: "Send prescriptions once",
    description: "Share a prescription with a pharmacy and follow review, pickup, or delivery status.",
  },
  {
    icon: BellIcon,
    title: "Keep treatment on track",
    description: "Set medicine reminders and get clearer follow-up when refills or responses are due.",
  },
]

const patientBenefits = [
  "Search before leaving home",
  "Save prescriptions and request updates",
  "Set dose and refill reminders",
  "AI-assisted medicine information",
]

const pharmacyBenefits = [
  "Keep high-demand stock visible",
  "Receive prescription requests in one place",
  "Suggest alternatives when stock is low",
  "Manage inventory with batch updates",
]

const audiences = [
  {
    id: "for-patients",
    icon: UserRoundIcon,
    title: "For patients and caregivers",
    description: "Find where medicine is available, send prescription requests, and avoid repeated calls when stock changes.",
    benefits: patientBenefits,
  },
  {
    id: "for-pharmacies",
    icon: Building2Icon,
    title: "For pharmacies",
    description: "Share availability, respond to requests faster, and help nearby patients make confident pickup decisions.",
    benefits: pharmacyBenefits,
  },
]

const workflow = [
  ["Search", "Look up the medicine you need and compare nearby pharmacy options."],
  ["Request", "Send a prescription or availability request directly to a selected pharmacy."],
  ["Collect", "Track the reply, confirm pickup or delivery, and keep reminders close."],
]

const stats = [
  { value: "10+", label: "Verified pharmacies", sublabel: "across Addis Ababa" },
  { value: "800+", label: "Medicines indexed", sublabel: "from the Ethiopia EML catalog" },
  { value: "50+", label: "Stock records", sublabel: "ready for search" },
  { value: "24/7", label: "Available", sublabel: "search & reminders" },
]

const capabilities = [
  { icon: PackageSearchIcon, title: "Medicine search", description: "Inventory from verified pharmacies across multiple Addis Ababa neighborhoods." },
  { icon: ClipboardCheckIcon, title: "Prescription workflow", description: "Upload, review, approve, or request resubmission; all tracked and auditable." },
  { icon: BellIcon, title: "Adherence tracking", description: "Dose-by-dose schedules with taken/skipped logging and refill alerts." },
  { icon: BotIcon, title: "AI health assistant", description: "Informational medicine guidance with mandatory medical disclaimers." },
  { icon: HeartPulseIcon, title: "Care coordination", description: "Availability requests, delivery options, and proxy pickup for caregivers." },
  { icon: ShieldCheckIcon, title: "Verified pharmacies", description: "Only admin-registered and verified pharmacies appear in search results." },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicNav />

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:py-16">
        <div className="flex flex-col justify-center gap-6">
          <Badge variant="secondary" className="w-fit">Addis Ababa medicine access</Badge>
          <div className="flex flex-col gap-4">
            <h1 className="max-w-4xl font-[var(--font-display)] text-5xl font-semibold tracking-normal md:text-7xl">
              Find the medicine you need without calling every pharmacy.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              MAP helps patients and caregivers search nearby pharmacy stock, send prescription requests, and get clearer updates from verified pharmacies.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link className={buttonVariants({ size: "lg" })} href="/register">
              Start searching
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
            <Link className={buttonVariants({ size: "lg", variant: "outline" })} href="/login">
              I already have an account
            </Link>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="grid gap-4">
            <div className="rounded-lg bg-secondary p-5">
              <p className="text-sm text-muted-foreground">Sample pharmacy search</p>
              <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold">Amoxicillin 500mg</h2>
              <div className="mt-5 grid gap-3">
                {[
                  { name: "Milo Pharmacy, Summit", status: "84 in stock", variant: "default" as const },
                  { name: "Red Cross Pharmacy, Arada", status: "60 in stock", variant: "default" as const },
                  { name: "Bole Pharmacy, Africa Avenue", status: "24 in stock", variant: "default" as const },
                  { name: "Gishen Pharmacy, Piassa", status: "Out", variant: "outline" as const },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-lg bg-background p-3">
                    <span>{item.name}</span>
                    <Badge variant={item.variant}>{item.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title}>
                  <CardHeader>
                    <feature.icon className="text-primary" />
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

      {/* Stats */}
      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-5 py-10 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-[var(--font-display)] text-4xl font-semibold text-primary">{stat.value}</p>
              <p className="mt-1 font-medium">{stat.label}</p>
              <p className="text-sm text-muted-foreground">{stat.sublabel}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-[0.35fr_0.65fr]">
          <div>
            <Badge variant="secondary">How it works</Badge>
            <h2 className="mt-4 font-[var(--font-display)] text-4xl font-semibold">Less calling around. More confirmed answers.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {workflow.map(([title, description], index) => (
              <Card key={title}>
                <CardHeader>
                  <Badge className="w-fit" variant="secondary">0{index + 1}</Badge>
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="border-y bg-card scroll-mt-20">
        <div className="mx-auto max-w-7xl px-5 py-16">
          <div className="mb-10 max-w-2xl">
            <Badge variant="secondary">Platform capabilities</Badge>
            <h2 className="mt-4 font-[var(--font-display)] text-4xl font-semibold">
              Everything patients and pharmacies need in one place.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((cap) => (
              <Card key={cap.title}>
                <CardHeader>
                  <cap.icon className="text-primary" />
                  <CardTitle className="text-lg">{cap.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{cap.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why MAP */}
      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border bg-secondary p-6">
            <Badge variant="outline">Why MAP</Badge>
            <h2 className="mt-4 font-[var(--font-display)] text-4xl font-semibold">Medicine access should not depend on guesswork.</h2>
            <p className="mt-3 text-muted-foreground">
              Stock changes quickly. Prescriptions need careful review. MAP brings search, requests, and reminders into one calm flow.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Minutes saved", "Search multiple pharmacies before traveling."],
              ["Clearer replies", "Know when a request is pending, approved, or unavailable."],
              ["Safer follow-up", "Keep reminders and medicine guidance close to the request."],
            ].map(([title, description]) => (
              <Card key={title}>
                <CardHeader>
                  <Clock3Icon className="text-primary" />
                  <CardTitle className="text-lg">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section id="who-its-for" className="border-y bg-card scroll-mt-20">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-16 md:grid-cols-2">
          {audiences.map((audience) => (
            <Card id={audience.id} key={audience.title}>
              <CardHeader>
                <audience.icon className="text-primary" />
                <CardTitle>{audience.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{audience.description}</CardDescription>
                <div className="mt-5 grid gap-2">
                  {audience.benefits.map((benefit) => (
                    <div key={benefit} className="flex items-center gap-2 text-sm">
                      <CheckCircle2Icon className="text-primary" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="bg-secondary scroll-mt-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-2">
          <div>
            <Badge variant="outline">Trust and privacy</Badge>
            <h2 className="mt-4 font-[var(--font-display)] text-4xl font-semibold">Designed for sensitive medicine decisions.</h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              MAP keeps prescription handling deliberate, pharmacy participation verified, and medicine guidance clearly separated from professional medical advice.
            </p>
          </div>
          <div className="grid gap-3">
            {[
              ["Verified pharmacy participation", ShieldCheckIcon],
              ["Prescription request tracking", ClipboardCheckIcon],
              ["Dose and refill reminders", BellIcon],
              ["Clear medical information labels", CheckCircle2Icon],
              ["Current stock and alternatives", PackageSearchIcon],
            ].map(([label, Icon]) => (
              <div key={label as string} className="flex items-center gap-3 rounded-lg bg-background p-4">
                <Icon className="text-primary" />
                <span className="font-medium">{label as string}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="rounded-lg border bg-card p-8 md:p-12">
          <Badge variant="secondary">Ready when you need it</Badge>
          <h2 className="mt-4 max-w-3xl font-[var(--font-display)] text-4xl font-semibold">Start with a medicine search, prescription request, or pharmacy staff login.</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Patients can create an account directly. Pharmacy teams sign in after an admin registers their branch.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <LandingAuthActions placement="section" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ShieldCheckIcon className="size-4" />
            </span>
            <span className="font-[var(--font-display)] font-semibold">MAP</span>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link className="transition hover:text-foreground" href="/#how-it-works">How it works</Link>
            <Link className="transition hover:text-foreground" href="/#capabilities">Capabilities</Link>
            <Link className="transition hover:text-foreground" href="/#who-its-for">Who it&apos;s for</Link>
            <Link className="transition hover:text-foreground" href="/#trust">Trust</Link>
          </nav>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Medicine Access Platform. AAU Computer Science.
          </p>
        </div>
      </footer>
    </main>
  )
}
