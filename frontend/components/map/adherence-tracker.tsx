"use client"

import { AlertCircleIcon, CheckIcon, ClockIcon, RotateCcwIcon, SkipForwardIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

type DoseStatus = "taken" | "skipped" | "upcoming"

type Dose = {
  id: string
  medicine: string
  dosage: string
  time: string
  status: DoseStatus
}

const initialDoses: Dose[] = [
  { id: "metformin-morning", medicine: "Metformin", dosage: "500mg", time: "8:00 AM", status: "taken" },
  { id: "lisinopril-midday", medicine: "Lisinopril", dosage: "10mg", time: "12:30 PM", status: "taken" },
  { id: "atorvastatin-evening", medicine: "Atorvastatin", dosage: "20mg", time: "8:00 PM", status: "upcoming" },
  { id: "omeprazole-night", medicine: "Omeprazole", dosage: "20mg", time: "9:30 PM", status: "upcoming" },
]

const statusConfig = {
  taken: { label: "Taken", variant: "default" as const, icon: CheckIcon, color: "text-emerald-600 dark:text-emerald-400" },
  skipped: { label: "Skipped", variant: "destructive" as const, icon: SkipForwardIcon, color: "text-amber-600 dark:text-amber-400" },
  upcoming: { label: "Upcoming", variant: "secondary" as const, icon: ClockIcon, color: "text-muted-foreground" },
}

export function AdherenceTracker() {
  const [doses, setDoses] = useState<Dose[]>(initialDoses)

  const takenCount = doses.filter((d) => d.status === "taken").length
  const skippedCount = doses.filter((d) => d.status === "skipped").length
  const upcomingCount = doses.filter((d) => d.status === "upcoming").length
  const completedCount = takenCount + skippedCount
  const progress = Math.round((takenCount / doses.length) * 100)
  const nextDose = useMemo(() => doses.find((d) => d.status === "upcoming"), [doses])

  function markDose(id: string, newStatus: DoseStatus) {
    setDoses((current) =>
      current.map((dose) =>
        dose.id === id ? { ...dose, status: newStatus } : dose
      )
    )
  }

  const adherenceLevel = progress >= 80 ? "Great" : progress >= 50 ? "Fair" : "Needs attention"

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-[var(--font-display)] text-3xl">{progress}%</CardTitle>
            <CardDescription>Today&apos;s adherence</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progress} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              {takenCount} / {doses.length}
            </CardTitle>
            <CardDescription>Doses taken</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{skippedCount}</CardTitle>
            <CardDescription>Doses skipped</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{nextDose?.time ?? "Complete"}</CardTitle>
            <CardDescription>{nextDose ? `Next: ${nextDose.medicine} ${nextDose.dosage}` : "All doses logged"}</CardDescription>
          </CardHeader>
        </Card>
      </section>

      {/* Adherence rating */}
      {completedCount > 0 ? (
        <Card className={progress >= 80 ? "border-emerald-500/30 bg-emerald-500/5" : progress >= 50 ? "border-amber-500/30 bg-amber-500/5" : "border-destructive/30 bg-destructive/5"}>
          <CardContent className="flex items-center gap-3 p-4">
            {progress >= 80 ? (
              <CheckIcon className="size-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircleIcon className="size-5 text-amber-600 dark:text-amber-400" />
            )}
            <span className="font-medium">
              {adherenceLevel} — {takenCount} taken, {skippedCount} skipped out of {doses.length} scheduled doses today.
            </span>
          </CardContent>
        </Card>
      ) : null}

      {/* Schedule */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-[var(--font-display)] text-xl font-semibold">Today&apos;s schedule</h2>
            <p className="text-sm text-muted-foreground">Mark each dose as taken or skipped.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setDoses(initialDoses)}>
            <RotateCcwIcon data-icon="inline-start" />
            Reset
          </Button>
        </div>

        {doses.map((dose) => {
          const config = statusConfig[dose.status]
          const StatusIcon = config.icon

          return (
            <Card key={dose.id}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className={`flex size-10 items-center justify-center rounded-full bg-secondary ${config.color}`}>
                    <StatusIcon className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{dose.medicine} {dose.dosage}</h3>
                    <p className="text-sm text-muted-foreground">{dose.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={config.variant}>{config.label}</Badge>
                  {dose.status === "upcoming" ? (
                    <>
                      <Button size="sm" onClick={() => markDose(dose.id, "taken")}>
                        <CheckIcon data-icon="inline-start" />
                        Taken
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => markDose(dose.id, "skipped")}>
                        <SkipForwardIcon data-icon="inline-start" />
                        Skip
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markDose(dose.id, "upcoming")}
                    >
                      Undo
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      {/* Refill alert */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-base">Refill reminder</CardTitle>
          <CardDescription>
            Based on your current schedule, Metformin 500mg may need a refill in approximately 5 days.
            Consider contacting your pharmacy or searching for stock.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/dashboard/find" className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm font-medium transition hover:bg-secondary">
            Search for Metformin stock
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
