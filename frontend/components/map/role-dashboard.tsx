"use client"

import type { LucideIcon } from "lucide-react"
import {
  ActivityIcon,
  BellIcon,
  ClipboardCheckIcon,
  Loader2Icon,
  PackageSearchIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import { RingCenter } from "@/components/charts/ring-center"
import { RingChart } from "@/components/charts/ring-chart"
import { Ring } from "@/components/charts/ring"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { getCurrentUser, type CurrentUser } from "@/lib/api"

type Kpi = {
  label: string
  value: string
  detail: string
  icon: LucideIcon
}

type RingDatum = {
  label: string
  value: number
  maxValue: number
  color: string
}

const patientActivity = [
  { day: "Mon", searches: 5, reminders: 2 },
  { day: "Tue", searches: 7, reminders: 3 },
  { day: "Wed", searches: 4, reminders: 3 },
  { day: "Thu", searches: 8, reminders: 2 },
  { day: "Fri", searches: 6, reminders: 3 },
  { day: "Sat", searches: 3, reminders: 1 },
  { day: "Sun", searches: 4, reminders: 2 },
]

const pharmacyRequests = [
  { day: "Mon", submitted: 18, completed: 11 },
  { day: "Tue", submitted: 24, completed: 17 },
  { day: "Wed", submitted: 19, completed: 16 },
  { day: "Thu", submitted: 31, completed: 22 },
  { day: "Fri", submitted: 28, completed: 20 },
  { day: "Sat", submitted: 14, completed: 10 },
  { day: "Sun", submitted: 9, completed: 7 },
]

const operationsTrend = [
  { day: "Mon", requests: 82, verifications: 8 },
  { day: "Tue", requests: 96, verifications: 11 },
  { day: "Wed", requests: 88, verifications: 9 },
  { day: "Thu", requests: 118, verifications: 14 },
  { day: "Fri", requests: 126, verifications: 12 },
  { day: "Sat", requests: 64, verifications: 6 },
  { day: "Sun", requests: 52, verifications: 5 },
]

const careChartConfig = {
  searches: { label: "Searches", color: "var(--chart-1)" },
  reminders: { label: "Reminders", color: "var(--chart-2)" },
} satisfies ChartConfig

const pharmacyChartConfig = {
  submitted: { label: "Submitted", color: "var(--chart-1)" },
  completed: { label: "Completed", color: "var(--chart-2)" },
} satisfies ChartConfig

const operationsChartConfig = {
  requests: { label: "Requests", color: "var(--chart-1)" },
  verifications: { label: "Verifications", color: "var(--chart-3)" },
} satisfies ChartConfig

export function RoleDashboard() {
  const [user, setUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    let active = true

    getCurrentUser().then((currentUser) => {
      if (active) setUser(currentUser)
    })

    return () => {
      active = false
    }
  }, [])

  if (!user?.profile) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
          Loading dashboard
        </div>
      </main>
    )
  }

  if (user.profile.role === "pharmacist") {
    return <PharmacistDashboard name={user.profile.fullName} />
  }

  if (user.profile.role === "admin") {
    return <OperationsDashboard name={user.profile.fullName} />
  }

  return <PatientDashboard name={user.profile.fullName} />
}

function KpiCard({ item }: { item: Kpi }) {
  const Icon = item.icon

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardDescription>{item.label}</CardDescription>
          <CardTitle className="mt-2 font-[var(--font-display)] text-3xl font-semibold">
            {item.value}
          </CardTitle>
        </div>
        <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{item.detail}</p>
      </CardContent>
    </Card>
  )
}

function DashboardHero({
  badge,
  title,
  description,
  primaryHref,
  primaryLabel,
  primaryIcon: PrimaryIcon,
  secondaryHref,
  secondaryLabel,
  secondaryIcon: SecondaryIcon,
}: {
  badge: string
  title: string
  description: string
  primaryHref: string
  primaryLabel: string
  primaryIcon: LucideIcon
  secondaryHref: string
  secondaryLabel: string
  secondaryIcon: LucideIcon
}) {
  return (
    <section className="rounded-xl border bg-card p-6">
      <Badge variant="secondary">{badge}</Badge>
      <h2 className="mt-4 max-w-4xl font-[var(--font-display)] text-4xl font-semibold">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className={buttonVariants()} href={primaryHref}>
          <PrimaryIcon data-icon="inline-start" />
          {primaryLabel}
        </Link>
        <Link className={buttonVariants({ variant: "outline" })} href={secondaryHref}>
          <SecondaryIcon data-icon="inline-start" />
          {secondaryLabel}
        </Link>
      </div>
    </section>
  )
}

function RechartsAreaPanel({
  title,
  description,
  config,
  data,
  firstKey,
  secondKey,
}: {
  title: string
  description: string
  config: ChartConfig
  data: Array<Record<string, string | number>>
  firstKey: string
  secondKey: string
}) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[280px] w-full">
          <AreaChart data={data} margin={{ left: 8, right: 8, top: 12 }}>
            <defs>
              <linearGradient id={`${firstKey}-fill`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor={`var(--color-${firstKey})`} stopOpacity={0.36} />
                <stop offset="95%" stopColor={`var(--color-${firstKey})`} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={32} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey={firstKey}
              stroke={`var(--color-${firstKey})`}
              fill={`url(#${firstKey}-fill)`}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey={secondKey}
              stroke={`var(--color-${secondKey})`}
              fill="transparent"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function RechartsBarPanel({
  title,
  description,
  config,
  data,
  firstKey,
  secondKey,
}: {
  title: string
  description: string
  config: ChartConfig
  data: Array<Record<string, string | number>>
  firstKey: string
  secondKey: string
}) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[280px] w-full">
          <BarChart data={data} margin={{ left: 8, right: 8, top: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={32} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey={firstKey} fill={`var(--color-${firstKey})`} radius={[6, 6, 0, 0]} />
            <Bar dataKey={secondKey} fill={`var(--color-${secondKey})`} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function BklitRingPanel({
  title,
  description,
  data,
}: {
  title: string
  description: string
  data: RingDatum[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="mx-auto size-56">
          <RingChart data={data} baseInnerRadius={54} ringGap={7} strokeWidth={13}>
            {data.map((item, index) => (
              <Ring key={item.label} index={index} />
            ))}
            <RingCenter defaultLabel="Total" />
          </RingChart>
        </div>
        <div className="grid gap-2">
          {data.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="font-medium tabular-nums">
                {Math.round((item.value / item.maxValue) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function DetailList({
  title,
  description,
  rows,
}: {
  title: string
  description: string
  rows: Array<{ label: string; detail: string; badge: string }>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div>
              <p className="font-medium">{row.label}</p>
              <p className="text-sm text-muted-foreground">{row.detail}</p>
            </div>
            <Badge variant="secondary">{row.badge}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function PatientDashboard({ name }: { name: string }) {
  const kpis: Kpi[] = [
    { label: "Today", value: "67%", detail: "2 of 3 doses marked", icon: ActivityIcon },
    { label: "Nearby stock", value: "3", detail: "Matches within Bole and Kazanchis", icon: PackageSearchIcon },
    { label: "Prescription", value: "1", detail: "Under pharmacy review", icon: ClipboardCheckIcon },
    { label: "Reminders", value: "2", detail: "Scheduled for this evening", icon: BellIcon },
  ]

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <DashboardHero
        badge="Patient dashboard"
        title={`Good morning, ${name}`}
        description="Search nearby medicine stock, keep prescriptions moving, and track the care tasks that need attention today."
        primaryHref="/dashboard/find"
        primaryLabel="Find medicine"
        primaryIcon={PackageSearchIcon}
        secondaryHref="/dashboard/prescriptions"
        secondaryLabel="Upload prescription"
        secondaryIcon={ClipboardCheckIcon}
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <KpiCard key={item.label} item={item} />
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <RechartsAreaPanel
          title="Care activity"
          description="Searches and reminders across the last 7 days."
          config={careChartConfig}
          data={patientActivity}
          firstKey="searches"
          secondKey="reminders"
        />
        <BklitRingPanel
          title="Today&apos;s care plan"
          description="Progress across the main tasks for today."
          data={[
            { label: "Doses", value: 2, maxValue: 3, color: "var(--chart-1)" },
            { label: "Prescription", value: 1, maxValue: 1, color: "var(--chart-2)" },
            { label: "Stock checks", value: 3, maxValue: 5, color: "var(--chart-3)" },
          ]}
        />
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <DetailList
          title="Needs attention"
          description="The next items to handle."
          rows={[
            { label: "Atorvastatin 20mg", detail: "Dose scheduled for 8:00 PM", badge: "Tonight" },
            { label: "Prescription #RX-2048", detail: "Lion Pharmacy is reviewing the upload", badge: "Review" },
            { label: "Metformin refill", detail: "Low supply based on current schedule", badge: "Refill" },
          ]}
        />
        <DetailList
          title="Nearby availability"
          description="Useful results from recent searches."
          rows={[
            { label: "Lion Pharmacy", detail: "Amoxicillin 500mg, 420m away", badge: "In stock" },
            { label: "Wudassie Pharmacy", detail: "Metformin 850mg, 900m away", badge: "Low stock" },
            { label: "Red Cross Pharmacy", detail: "Insulin N, delivery available", badge: "Delivery" },
          ]}
        />
      </section>
    </main>
  )
}

function PharmacistDashboard({ name }: { name: string }) {
  const kpis: Kpi[] = [
    { label: "Total SKUs", value: "1,240", detail: "Across active branch inventory", icon: ActivityIcon },
    { label: "Low stock", value: "14", detail: "Need reorder review", icon: PackageSearchIcon },
    { label: "Pending", value: "12", detail: "Requests waiting on response", icon: BellIcon },
    { label: "Filled today", value: "28", detail: "Completed pickup or delivery", icon: ClipboardCheckIcon },
  ]

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <DashboardHero
        badge="Pharmacy dashboard"
        title={`Inventory desk, ${name}`}
        description="Keep branch stock current, prioritize requests, and spot demand changes before patients call branch by branch."
        primaryHref="/dashboard/pharmacy/inventory"
        primaryLabel="Manage inventory"
        primaryIcon={ActivityIcon}
        secondaryHref="/dashboard/pharmacy/requests"
        secondaryLabel="Review requests"
        secondaryIcon={BellIcon}
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <KpiCard key={item.label} item={item} />
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <RechartsBarPanel
          title="Request flow"
          description="Submitted versus completed prescription requests."
          config={pharmacyChartConfig}
          data={pharmacyRequests}
          firstKey="submitted"
          secondKey="completed"
        />
        <BklitRingPanel
          title="Stock health"
          description="Current inventory readiness by category."
          data={[
            { label: "Core medicine", value: 88, maxValue: 100, color: "var(--chart-1)" },
            { label: "Chronic care", value: 72, maxValue: 100, color: "var(--chart-2)" },
            { label: "Antibiotics", value: 61, maxValue: 100, color: "var(--chart-4)" },
          ]}
        />
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <DetailList
          title="Request queue"
          description="Requests that need a branch response."
          rows={[
            { label: "Abebe Bikila", detail: "Amoxicillin 500mg prescription", badge: "Urgent" },
            { label: "Hana Tefera", detail: "Insulin availability confirmation", badge: "Pending" },
            { label: "Selam Tesfaye", detail: "Delivery estimate requested", badge: "Estimate" },
          ]}
        />
        <DetailList
          title="Inventory watch"
          description="Items close to reorder or expiry limits."
          rows={[
            { label: "Metformin 850mg", detail: "12 units remaining", badge: "Low" },
            { label: "Paracetamol 500mg", detail: "Expiry date already passed", badge: "Expired" },
            { label: "Omeprazole 20mg", detail: "Demand increased this week", badge: "Watch" },
          ]}
        />
      </section>
    </main>
  )
}

function OperationsDashboard({ name }: { name: string }) {
  const kpis: Kpi[] = [
    { label: "Pharmacies", value: "38", detail: "Registered branches", icon: ShieldCheckIcon },
    { label: "Awaiting review", value: "6", detail: "Verification queue", icon: UsersIcon },
    { label: "Active accounts", value: "412", detail: "Patients and caregivers", icon: ActivityIcon },
    { label: "Network fill rate", value: "78%", detail: "Requests with confirmed stock", icon: TrendingUpIcon },
  ]

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <DashboardHero
        badge="Operations dashboard"
        title={`Operations review, ${name}`}
        description="Monitor pharmacy participation, request flow, and trust signals across the medicine access network."
        primaryHref="/dashboard/pharmacy/verification"
        primaryLabel="Verify pharmacies"
        primaryIcon={ShieldCheckIcon}
        secondaryHref="/dashboard/pharmacy/requests"
        secondaryLabel="Monitor requests"
        secondaryIcon={UsersIcon}
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <KpiCard key={item.label} item={item} />
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <RechartsAreaPanel
          title="Network activity"
          description="Requests and pharmacy verification work by day."
          config={operationsChartConfig}
          data={operationsTrend}
          firstKey="requests"
          secondKey="verifications"
        />
        <BklitRingPanel
          title="Network readiness"
          description="Coverage signals for the operating network."
          data={[
            { label: "Verified", value: 32, maxValue: 38, color: "var(--chart-1)" },
            { label: "Responsive", value: 29, maxValue: 38, color: "var(--chart-2)" },
            { label: "Delivery ready", value: 21, maxValue: 38, color: "var(--chart-3)" },
          ]}
        />
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <DetailList
          title="Verification queue"
          description="Branches that need final review."
          rows={[
            { label: "Medhanialem Pharmacy", detail: "License uploaded, address check pending", badge: "Address" },
            { label: "Bole HealthPlus", detail: "Owner profile needs confirmation", badge: "Owner" },
            { label: "Arada Unity Pharma", detail: "Inventory sample submitted", badge: "Stock" },
          ]}
        />
        <DetailList
          title="Network watch"
          description="Signals that may need follow-up."
          rows={[
            { label: "Bole sub-city", detail: "Higher antibiotic demand this week", badge: "Demand" },
            { label: "Kazanchis", detail: "Two requests missed response target", badge: "SLA" },
            { label: "Arada", detail: "Delivery coverage below target", badge: "Coverage" },
          ]}
        />
      </section>
    </main>
  )
}
