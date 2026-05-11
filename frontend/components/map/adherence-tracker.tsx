"use client"

import { AlertCircleIcon, CheckIcon, ClockIcon, Loader2Icon, RotateCcwIcon, SkipForwardIcon } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  createReminder,
  getTodayAdherence,
  resetTodayAdherence,
  updateDoseEventStatus,
  type AdherenceDose,
  type DoseStatus,
  type TodayAdherence,
} from "@/lib/api"

const statusConfig = {
  taken: { label: "Taken", variant: "default" as const, icon: CheckIcon, color: "text-emerald-600 dark:text-emerald-400" },
  skipped: { label: "Skipped", variant: "destructive" as const, icon: SkipForwardIcon, color: "text-amber-600 dark:text-amber-400" },
  upcoming: { label: "Upcoming", variant: "secondary" as const, icon: ClockIcon, color: "text-muted-foreground" },
} satisfies Record<DoseStatus, {
  label: string
  variant: "default" | "destructive" | "secondary"
  icon: typeof CheckIcon
  color: string
}>

function emptySummary(): TodayAdherence["summary"] {
  return {
    total: 0,
    taken: 0,
    skipped: 0,
    upcoming: 0,
    progress: 0,
    refillAlerts: 0,
  }
}

function defaultNextDoseValue() {
  const date = new Date(Date.now() + 60 * 60 * 1000)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
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
  const adherenceLevel = summary.progress >= 80 ? "Great" : summary.progress >= 50 ? "Fair" : "Needs attention"

  async function markDose(id: string, newStatus: DoseStatus) {
    setSavingDoseId(id)
    setError("")

    try {
      await updateDoseEventStatus(id, newStatus)
      await loadAdherence()
    } catch {
      setError("Unable to update that dose.")
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
    } catch {
      setError("Unable to reset today's doses.")
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateReminder(event: React.FormEvent<HTMLFormElement>) {
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
    } catch {
      setError("Unable to save that reminder. Check the fields and try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-[var(--font-display)] text-3xl">{summary.progress}%</CardTitle>
            <CardDescription>Today&apos;s adherence</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={summary.progress} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              {summary.taken} / {summary.total}
            </CardTitle>
            <CardDescription>Doses taken</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{summary.skipped}</CardTitle>
            <CardDescription>Doses skipped</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{nextDose?.time ?? (summary.total ? "Complete" : "None")}</CardTitle>
            <CardDescription>{nextDose ? `Next: ${nextDose.medicine}` : "Next dose"}</CardDescription>
          </CardHeader>
        </Card>
      </section>

      {summary.total > 0 ? (
        <Card className={summary.progress >= 80 ? "border-emerald-500/30 bg-emerald-500/5" : summary.progress >= 50 ? "border-amber-500/30 bg-amber-500/5" : "border-destructive/30 bg-destructive/5"}>
          <CardContent className="flex items-center gap-3 p-4">
            {summary.progress >= 80 ? (
              <CheckIcon className="size-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircleIcon className="size-5 text-amber-600 dark:text-amber-400" />
            )}
            <span className="font-medium">
              {adherenceLevel}: {summary.taken} taken, {summary.skipped} skipped out of {summary.total} scheduled doses today.
            </span>
          </CardContent>
        </Card>
      ) : null}

      <form className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1fr_8rem_10rem_12rem_8rem_auto]" onSubmit={handleCreateReminder}>
        <Input value={medicineName} onChange={(event) => setMedicineName(event.target.value)} placeholder="Medicine" aria-label="Medicine name" required />
        <Input value={dosage} onChange={(event) => setDosage(event.target.value)} placeholder="Dose" aria-label="Dosage" required />
        <Input value={frequency} onChange={(event) => setFrequency(event.target.value)} placeholder="Frequency" aria-label="Frequency" required />
        <Input type="datetime-local" value={nextDoseAt} onChange={(event) => setNextDoseAt(event.target.value)} aria-label="Next dose time" required />
        <Input type="number" min="0" value={supplyRemainingDays} onChange={(event) => setSupplyRemainingDays(event.target.value)} placeholder="Supply" aria-label="Supply remaining days" />
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : null}
          Add
        </Button>
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-[var(--font-display)] text-xl font-semibold">Today&apos;s schedule</h2>
            <p className="text-sm text-muted-foreground">Mark each dose as taken or skipped.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={resetDoses} disabled={saving || !doses.length}>
            {saving ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <RotateCcwIcon data-icon="inline-start" />}
            Reset
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
          doses.map((dose) => {
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
                      <p className="text-sm text-muted-foreground">{dose.time} / {dose.frequency}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={config.variant}>{config.label}</Badge>
                    {dose.status === "upcoming" ? (
                      <>
                        <Button size="sm" onClick={() => markDose(dose.id, "taken")} disabled={savingDoseId === dose.id}>
                          <CheckIcon data-icon="inline-start" />
                          Taken
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => markDose(dose.id, "skipped")} disabled={savingDoseId === dose.id}>
                          <SkipForwardIcon data-icon="inline-start" />
                          Skip
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => markDose(dose.id, "upcoming")} disabled={savingDoseId === dose.id}>
                        Undo
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No reminders yet</CardTitle>
              <CardDescription>Add a medicine above to start tracking today&apos;s schedule.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </section>

      <Card className={summary.refillAlerts ? "border-amber-500/30 bg-amber-500/5" : ""}>
        <CardHeader>
          <CardTitle className="text-base">Refill reminders</CardTitle>
          <CardDescription>
            {summary.refillAlerts
              ? `${summary.refillAlerts} medicine${summary.refillAlerts === 1 ? "" : "s"} may need a refill soon.`
              : "No refill alerts from your active reminders."}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
