"use client"

import { CheckIcon, ClockIcon, RotateCcwIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

type Dose = {
  id: string
  medicine: string
  time: string
  status: "taken" | "upcoming"
}

const initialDoses: Dose[] = [
  { id: "metformin-morning", medicine: "Metformin 500mg", time: "8:00 AM", status: "taken" },
  { id: "lisinopril-midday", medicine: "Lisinopril 10mg", time: "12:30 PM", status: "taken" },
  { id: "atorvastatin-evening", medicine: "Atorvastatin 20mg", time: "8:00 PM", status: "upcoming" },
]

export function AdherenceTracker() {
  const [doses, setDoses] = useState<Dose[]>(initialDoses)

  const takenCount = doses.filter((dose) => dose.status === "taken").length
  const progress = Math.round((takenCount / doses.length) * 100)
  const nextDose = useMemo(() => doses.find((dose) => dose.status === "upcoming"), [doses])

  function toggleDose(id: string) {
    setDoses((currentDoses) =>
      currentDoses.map((dose) =>
        dose.id === id
          ? { ...dose, status: dose.status === "taken" ? "upcoming" : "taken" }
          : dose
      )
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{progress}%</CardTitle>
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
            <CardTitle>{nextDose?.time ?? "Complete"}</CardTitle>
            <CardDescription>{nextDose ? `Next dose: ${nextDose.medicine}` : "All doses marked"}</CardDescription>
          </CardHeader>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-[var(--font-display)] text-xl font-semibold">Today&apos;s schedule</h2>
            <p className="text-sm text-muted-foreground">Mark doses as you take them.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setDoses(initialDoses)}>
            <RotateCcwIcon data-icon="inline-start" />
            Reset
          </Button>
        </div>
        {doses.map((dose) => (
          <Card key={dose.id}>
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold">{dose.medicine}</h3>
                <p className="text-sm text-muted-foreground">{dose.time}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={dose.status === "taken" ? "default" : "secondary"}>
                  {dose.status === "taken" ? "Taken" : "Upcoming"}
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  variant={dose.status === "taken" ? "outline" : "default"}
                  onClick={() => toggleDose(dose.id)}
                >
                  {dose.status === "taken" ? (
                    <CheckIcon data-icon="inline-start" />
                  ) : (
                    <ClockIcon data-icon="inline-start" />
                  )}
                  {dose.status === "taken" ? "Taken" : "Mark taken"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}
