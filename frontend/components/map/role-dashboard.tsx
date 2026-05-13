"use client"

import {
  ActivityIcon,
  BellIcon,
  ClipboardCheckIcon,
  type LucideIcon,
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
import { getDashboardSummary, type DashboardIconName, type DashboardSummary } from "@/lib/api"

type Kpi = {
  label: string
  value: string
  detail: string
  icon: DashboardIconName
}

type RingDatum = {
  label: string
  value: number
  maxValue: number
  color: string
}

const iconMap: Record<DashboardIconName, LucideIcon> = {
  activity: ActivityIcon,
  bell: BellIcon,
  clipboard: ClipboardCheckIcon,
  package: PackageSearchIcon,
  shield: ShieldCheckIcon,
  trend: TrendingUpIcon,
  users: UsersIcon,
}

function buildChartConfig(chart: DashboardSummary["chart"]) {
  return {
    [chart.firstKey]: { label: chart.firstLabel, color: chart.firstColor },
    [chart.secondKey]: { label: chart.secondLabel, color: chart.secondColor },
  } satisfies ChartConfig
}

export function RoleDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    getDashboardSummary()
      .then((dashboard) => {
        if (active) setSummary(dashboard)
      })
      .catch(() => {
        if (active) setError("Unable to load dashboard.")
      })

    return () => {
      active = false
    }
  }, [])

  if (error) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{error}</div>
      </main>
    )
  }

  if (!summary) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
          Loading dashboard
        </div>
      </main>
    )
  }

  return <DashboardView summary={summary} />
}

function KpiCard({ item }: { item: Kpi }) {
  const Icon = iconMap[item.icon]

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
  primaryIcon,
  secondaryHref,
  secondaryLabel,
  secondaryIcon,
}: {
  badge: string
  title: string
  description: string
  primaryHref: string
  primaryLabel: string
  primaryIcon: DashboardIconName
  secondaryHref: string
  secondaryLabel: string
  secondaryIcon: DashboardIconName
}) {
  const PrimaryIcon = iconMap[primaryIcon]
  const SecondaryIcon = iconMap[secondaryIcon]

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
  empty,
}: {
  title: string
  description: string
  rows: Array<{ label: string; detail: string; badge: string }>
  empty: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{empty}</div>
        ) : null}
        {rows.map((row, index) => (
          <div key={`${row.label}-${row.detail}-${index}`} className="flex items-start justify-between gap-4 rounded-lg border p-3">
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

function DashboardView({ summary }: { summary: DashboardSummary }) {
  const chartConfig = buildChartConfig(summary.chart)

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <DashboardHero {...summary.hero} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summary.kpis.map((item) => (
          <KpiCard key={item.label} item={item} />
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        {summary.chart.kind === "bar" ? (
          <RechartsBarPanel
            title={summary.chart.title}
            description={summary.chart.description}
            config={chartConfig}
            data={summary.chart.data}
            firstKey={summary.chart.firstKey}
            secondKey={summary.chart.secondKey}
          />
        ) : (
          <RechartsAreaPanel
            title={summary.chart.title}
            description={summary.chart.description}
            config={chartConfig}
            data={summary.chart.data}
            firstKey={summary.chart.firstKey}
            secondKey={summary.chart.secondKey}
          />
        )}
        <BklitRingPanel
          title={summary.ring.title}
          description={summary.ring.description}
          data={summary.ring.data}
        />
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        {summary.lists.map((list) => (
          <DetailList
            key={list.title}
            title={list.title}
            description={list.description}
            rows={list.rows}
            empty={list.empty}
          />
        ))}
      </section>
    </main>
  )
}
