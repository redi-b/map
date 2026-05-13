"use client"

import {
  BellRingIcon,
  CalendarClockIcon,
  CheckIcon,
  ClockIcon,
  Loader2Icon,
  PillIcon,
  RotateCcwIcon,
  SkipForwardIcon,
  SparklesIcon,
  TrendingUpIcon,
} from "lucide-react"
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  createReminder,
  getTodayAdherence,
  resetTodayAdherence,
  updateDoseEventStatus,
  type AdherenceDose,
  type DoseStatus,
  type TodayAdherence,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"

const statusConfig = {
  taken: { label: "Taken", variant: "default" as const, icon: CheckIcon, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  skipped: { label: "Skipped", variant: "destructive" as const, icon: SkipForwardIcon, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  upcoming: { label: "Upcoming", variant: "secondary" as const, icon: ClockIcon, color: "text-muted-foreground", bg: "bg-secondary" },
} satisfies Record<DoseStatus, {
  label: string
  variant: "default" | "destructive" | "secondary"
  icon: typeof CheckIcon
  color: string
  bg: string
}>

const frequencyOptions = ["Once daily", "Twice daily", "Every 8 hours", "Before meals", "After meals", "At bedtime"]

function emptySummary(): TodayAdherence["summary"] {
  return { total: 0, taken: 0, skipped: 0, upcoming: 0, progress: 0, refillAlerts: 0 }
}

function defaultNextDoseValue() {
  const date = new Date(Date.now() + 60 * 60 * 1000)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function formatScheduleDate(value: string) {
  return new Intl.DateTimeFormat("en", { weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value))
}

function getAdherenceLevel(progress: number) {
  if (progress >= 85) return { label: "Great", tone: "emerald", message: "You are on track today. Keep going." }
  if (progress >= 50) return { label: "Steady", tone: "amber", message: "A few timely check-ins can lift today’s score." }
  if (progress > 0) return { label: "Needs attention", tone: "red", message: "Focus on the next dose and use undo if a status was marked by mistake." }
  return { label: "Ready", tone: "neutral", message: "Add or mark your first dose to start tracking today." }
}

function isDueSoon(dose: AdherenceDose) {
  const scheduledAt = new Date(dose.scheduledAt).getTime()
  return dose.status === "upcoming" && scheduledAt - Date.now() <= 60 * 60 * 1000 && scheduledAt >= Date.now() - 15 * 60 * 1000
}

export function AdherenceTracker() {
  const [doses, setDoses] = useState<AdherenceDose[]>([])
  const [summary, setSummary] = useState<TodayAdherence["summary"]>(emptySummary)
  const [medicineName, setMedicineName] = useState("")
  const [dosage, setDosage] = useState("")
  const [frequency, setFrequency] = useState("Once daily")
  const [nextDoseAt, setNextDoseAt] = useState(defaultNextDoseValue)
  const [supplyRemainingDays, setSupplyRemainingDays] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingDoseId, setSavingDoseId] = useState("")
  const [error, setError] = useState("")

  const loadAdherence = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const data = await getTodayAdherence()
      setDoses(data.doses)
      setSummary(data.summary)
    } catch {
      setError("Unable to load your adherence schedule.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadAdherence()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [loadAdherence])

  const nextDose = useMemo(() => doses.find((dose) => dose.status === "upcoming"), [doses])
  const adherenceLevel = getAdherenceLevel(summary.progress)
  const dueSoon = useMemo(() => doses.filter(isDueSoon), [doses])
  const completed = summary.total > 0 && summary.upcoming === 0

  async function markDose(id: string, newStatus: DoseStatus) {
    setSavingDoseId(id)
    setError("")

    try {
      await updateDoseEventStatus(id, newStatus)
      await loadAdherence()
      toast.success(newStatus === "taken" ? "Dose marked taken" : newStatus === "skipped" ? "Dose skipped" : "Dose restored")
    } catch {
      setError("Unable to update that dose.")
      toast.error("Dose not updated", "Try again in a moment.")
    } finally {
      setSavingDoseId("")
    }
  }

  async function resetDoses() {
    setSaving(true)
    setError("")

    try {
      await resetTodayAdherence()
      await loadAdherence()
      toast.success("Schedule reset", "Today's doses are back to upcoming.")
    } catch {
      setError("Unable to reset today's doses.")
      toast.error("Schedule not reset", "Try again in a moment.")
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")

    try {
      await createReminder({
        medicineName,
        dosage,
        frequency,
        nextDoseAt: new Date(nextDoseAt).toISOString(),
        supplyRemainingDays: supplyRemainingDays ? Number(supplyRemainingDays) : undefined,
      })
      setMedicineName("")
      setDosage("")
      setFrequency("Once daily")
      setNextDoseAt(defaultNextDoseValue())
      setSupplyRemainingDays("")
      await loadAdherence()
      toast.success("Reminder added", `${medicineName} is now in today's schedule.`)
    } catch {
      setError("Unable to save that reminder. Check the fields and try again.")
      toast.error("Reminder not saved", "Check the fields and try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className={cn("overflow-hidden", adherenceLevel.tone === "emerald" && "border-emerald-500/30", adherenceLevel.tone === "amber" && "border-amber-500/30", adherenceLevel.tone === "red" && "border-destructive/30")}>
          <CardContent className="grid gap-6 p-6 md:grid-cols-[11rem_1fr] md:items-center">
            <div className="relative flex aspect-square items-center justify-center rounded-full bg-primary/10">
              <div className="absolute inset-3 rounded-full border-8 border-primary/20" />
              <div className="text-center">
                <p className="font-[var(--font-display)] text-4xl font-semibold">{summary.progress}%</p>
                <p className="text-xs text-muted-foreground">today</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Badge variant="secondary" className="mb-3">{adherenceLevel.label}</Badge>
                <h1 className="font-[var(--font-display)] text-3xl font-semibold">Medication adherence</h1>
                <p className="mt-2 text-sm text-muted-foreground">{adherenceLevel.message}</p>
              </div>
              <Progress value={summary.progress} />
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <div className="rounded-xl border bg-muted/30 p-3"><span className="text-muted-foreground">Taken</span><p className="text-xl font-semibold">{summary.taken}</p></div>
                <div className="rounded-xl border bg-muted/30 p-3"><span className="text-muted-foreground">Upcoming</span><p className="text-xl font-semibold">{summary.upcoming}</p></div>
                <div className="rounded-xl border bg-muted/30 p-3"><span className="text-muted-foreground">Skipped</span><p className="text-xl font-semibold">{summary.skipped}</p></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><CalendarClockIcon className="size-4" /> Next dose</CardTitle>
              <CardDescription>{nextDose ? `${nextDose.medicine} ${nextDose.dosage}` : completed ? "All scheduled doses are complete." : "No upcoming dose yet."}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-[var(--font-display)] text-2xl font-semibold">{nextDose ? formatScheduleDate(nextDose.scheduledAt) : completed ? "Done" : "Not set"}</p>
              {dueSoon.length ? <Badge className="mt-3" variant="secondary">{dueSoon.length} due soon</Badge> : null}
            </CardContent>
          </Card>
          <Card className={summary.refillAlerts ? "border-amber-500/30 bg-amber-500/5" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><BellRingIcon className="size-4" /> Refill watch</CardTitle>
              <CardDescription>{summary.refillAlerts ? `${summary.refillAlerts} medicine${summary.refillAlerts === 1 ? "" : "s"} may need a refill soon.` : "No refill alerts from active reminders."}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>Add reminder</CardTitle>
            <CardDescription>Keep it simple: add the next scheduled dose and optional supply days.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 lg:grid-cols-[1fr_8rem_12rem_12rem_8rem_auto]" onSubmit={handleCreateReminder}>
              <label className="grid gap-1 text-sm font-medium">
                Medicine
                <Input value={medicineName} onChange={(event) => setMedicineName(event.target.value)} placeholder="e.g. Amoxicillin" autoComplete="off" required />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Dose
                <Input value={dosage} onChange={(event) => setDosage(event.target.value)} placeholder="500mg" required />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Frequency
                <Select value={frequency} onValueChange={(value) => setFrequency(value ?? "Once daily")}>
                  <SelectTrigger className="w-full" aria-label="Frequency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {frequencyOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Next dose
                <Input type="datetime-local" value={nextDoseAt} onChange={(event) => setNextDoseAt(event.target.value)} required />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Supply days
                <Input type="number" min="0" value={supplyRemainingDays} onChange={(event) => setSupplyRemainingDays(event.target.value)} placeholder="Optional" />
              </label>
              <Button className="lg:mt-6" type="submit" disabled={saving}>
                {saving ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <PillIcon data-icon="inline-start" />}
                Add
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-secondary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><SparklesIcon className="size-4" /> Helpful tips</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground">
            <p>Mark doses as soon as you take them so your progress stays accurate.</p>
            <p>Use “Skip” only when a dose was intentionally missed. Ask a clinician before doubling doses.</p>
            <p>Add supply days to get refill warnings before medicine runs out.</p>
          </CardContent>
        </Card>
      </section>

      {error ? <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-[var(--font-display)] text-xl font-semibold">Today&apos;s schedule</h2>
            <p className="text-sm text-muted-foreground">A timeline of doses scheduled for today. Use undo if a status was marked by mistake.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={resetDoses} disabled={saving || !doses.length}>
            {saving ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <RotateCcwIcon data-icon="inline-start" />}
            Reset today
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading schedule
            </CardContent>
          </Card>
        ) : doses.length ? (
          <div className="grid gap-3">
            {doses.map((dose, index) => {
              const config = statusConfig[dose.status]
              const StatusIcon = config.icon
              const soon = isDueSoon(dose)

              return (
                <Card key={dose.id} className={cn(soon && "border-primary/40 bg-primary/5")}>
                  <CardContent className="grid gap-4 p-4 md:grid-cols-[3rem_1fr_auto] md:items-center">
                    <div className="flex md:flex-col md:items-center">
                      <div className={cn("flex size-11 items-center justify-center rounded-full", config.bg, config.color)}>
                        <StatusIcon className="size-5" />
                      </div>
                      {index < doses.length - 1 ? <div className="hidden h-8 w-px bg-border md:block" /> : null}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{dose.medicine} {dose.dosage}</h3>
                        <Badge variant={config.variant}>{config.label}</Badge>
                        {soon ? <Badge variant="outline">Due soon</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{formatScheduleDate(dose.scheduledAt)} · {dose.frequency}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {dose.status === "upcoming" ? (
                        <>
                          <Button size="sm" onClick={() => void markDose(dose.id, "taken")} disabled={savingDoseId === dose.id}>
                            {savingDoseId === dose.id ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <CheckIcon data-icon="inline-start" />}
                            Taken
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void markDose(dose.id, "skipped")} disabled={savingDoseId === dose.id}>
                            <SkipForwardIcon data-icon="inline-start" />
                            Skip
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => void markDose(dose.id, "upcoming")} disabled={savingDoseId === dose.id}>
                          Undo
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <PillIcon className="size-10 text-muted-foreground" />
              <div>
                <CardTitle>No reminders yet</CardTitle>
                <CardDescription className="mt-1">Add a medicine above to start tracking today&apos;s schedule.</CardDescription>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><TrendingUpIcon className="size-4" /> Weekly habit nudge</CardTitle>
          <CardDescription>Small, consistent updates are more useful than perfect logs. Review your next dose first, then refill needs.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
