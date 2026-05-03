import { CheckIcon, ClockIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const doses = [
  ["Metformin 500mg", "8:00 AM", "Taken"],
  ["Lisinopril 10mg", "12:30 PM", "Taken"],
  ["Atorvastatin 20mg", "8:00 PM", "Upcoming"],
]

export default function AdherencePage() {
  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>67%</CardTitle>
            <CardDescription>Today&apos;s adherence</CardDescription>
          </CardHeader>
          <CardContent><Progress value={67} /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>2 / 3</CardTitle>
            <CardDescription>Doses taken</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>1</CardTitle>
            <CardDescription>Refill alert</CardDescription>
          </CardHeader>
        </Card>
      </section>
      <section className="flex flex-col gap-3">
        {doses.map(([medicine, time, status]) => (
          <Card key={medicine}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div>
                <h2 className="font-semibold">{medicine}</h2>
                <p className="text-sm text-muted-foreground">{time}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={status === "Taken" ? "default" : "secondary"}>{status}</Badge>
                <Button size="sm" variant={status === "Taken" ? "outline" : "default"}>
                  {status === "Taken" ? <CheckIcon data-icon="inline-start" /> : <ClockIcon data-icon="inline-start" />}
                  {status === "Taken" ? "Taken" : "Mark taken"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  )
}
