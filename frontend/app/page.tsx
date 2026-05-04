import {
  ArrowRightIcon,
  BellIcon,
  BotIcon,
  Building2Icon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  MapPinIcon,
  PackageSearchIcon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react"
import Link from "next/link"
import { PublicNav } from "@/components/map/public-nav"
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

const roles = [
  {
    icon: UserRoundIcon,
    title: "Patients",
    description: "Search stock, upload prescriptions, track requests, and manage dose reminders.",
  },
  {
    icon: Building2Icon,
    title: "Pharmacies",
    description: "Maintain inventory, receive prescription requests, approve, reject, or suggest alternatives.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Administrators",
    description: "Register pharmacies, verify access, and monitor platform activity.",
  },
]

const workflow = [
  ["Search", "Patients search medicine availability near their location."],
  ["Confirm", "Pharmacies keep stock and prescription responses current."],
  ["Track", "Requests, pickup, delivery, and reminders stay visible in one place."],
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicNav />

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

      <section id="how-it-works" className="border-y bg-card">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-[0.35fr_0.65fr]">
          <div>
            <Badge variant="secondary">Workflow</Badge>
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

      <section id="roles" className="mx-auto max-w-7xl px-5 py-16">
        <div className="max-w-2xl">
          <Badge variant="secondary">Role based</Badge>
          <h2 className="mt-4 font-[var(--font-display)] text-4xl font-semibold">Different users need different tools.</h2>
          <p className="mt-3 text-muted-foreground">
            MAP separates patient, pharmacist, and admin access from the start, so each account lands in the right workspace.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.title}>
              <CardHeader>
                <role.icon className="size-6 text-primary" />
                <CardTitle>{role.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{role.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="trust" className="bg-secondary">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-2">
          <div>
            <Badge variant="outline">Trust layer</Badge>
            <h2 className="mt-4 font-[var(--font-display)] text-4xl font-semibold">Built for sensitive medicine workflows.</h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Prescription requests, pharmacy verification, role-based access, and medical disclaimers are first-class parts of the product.
            </p>
          </div>
          <div className="grid gap-3">
            {[
              ["Role-based dashboard access", ShieldCheckIcon],
              ["Prescription status tracking", ClipboardCheckIcon],
              ["Dose and refill reminders", BellIcon],
              ["Verified medical info labels", CheckCircle2Icon],
              ["Pharmacy stock operations", PackageSearchIcon],
            ].map(([label, Icon]) => (
              <div key={label as string} className="flex items-center gap-3 rounded-lg bg-background p-4">
                <Icon className="size-5 text-primary" />
                <span className="font-medium">{label as string}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="rounded-lg border bg-card p-8 md:p-12">
          <h2 className="max-w-3xl font-[var(--font-display)] text-4xl font-semibold">Start with the role you actually use.</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Create an account, choose your role, and MAP will route you to the right dashboard.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button render={<Link href="/register" />}>Create account</Button>
            <Button variant="outline" render={<Link href="/login" />}>Sign in</Button>
          </div>
        </div>
      </section>
    </main>
  )
}
