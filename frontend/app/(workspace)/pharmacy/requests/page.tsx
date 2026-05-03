import { CheckIcon, XIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const inbox = [
  ["Abebe Bikila", "Amoxicillin 500mg", "Urgent review", "2m ago"],
  ["Hana Tefera", "Request #MAP-7821", "Pending approval", "15m ago"],
  ["Selam Tesfaye", "Request #MAP-7815", "Pending approval", "3h ago"],
]

export default function PharmacyRequestsPage() {
  return (
    <main className="grid gap-6 p-4 lg:grid-cols-[0.34fr_0.66fr] md:p-6">
      <aside className="flex flex-col gap-3">
        {inbox.map(([name, detail, status, time], index) => (
          <Card key={name} className={index === 0 ? "border-primary" : undefined}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{name}</h2>
                  <p className="text-sm text-muted-foreground">{detail}</p>
                  <Badge className="mt-2" variant={index === 0 ? "default" : "secondary"}>{status}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">{time}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </aside>
      <section className="grid gap-4 xl:grid-cols-[0.55fr_0.45fr]">
        <Card>
          <CardHeader>
            <CardTitle>Prescription image</CardTitle>
            <CardDescription>Review the uploaded image before approving the request.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex aspect-[4/5] items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              Prescription preview
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Patient record</CardTitle><CardDescription>32 years, male, allergy: Penicillin</CardDescription></CardHeader>
          </Card>
          <Card>
            <CardHeader><CardTitle>Identified medications</CardTitle><CardDescription>Amoxicillin 500mg x20, Paracetamol 500mg x10</CardDescription></CardHeader>
            <CardContent className="flex gap-2">
              <Button variant="outline"><XIcon data-icon="inline-start" />Reject</Button>
              <Button><CheckIcon data-icon="inline-start" />Approve</Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
