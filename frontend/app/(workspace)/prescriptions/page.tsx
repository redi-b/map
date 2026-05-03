import { CheckCircle2Icon, ClockIcon, UploadIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const prescriptions = [
  ["#MAP-7822-AD", "Under review", "Lion Pharmacy", "2 medications identified"],
  ["#MAP-7794-BA", "Approved", "Wudassie Pharmacy", "Ready for pickup"],
  ["#MAP-7731-KZ", "Completed", "HealthPlus", "Delivered yesterday"],
]

export default function PrescriptionsPage() {
  return (
    <main className="grid gap-6 p-4 md:grid-cols-[0.7fr_0.3fr] md:p-6">
      <section className="flex flex-col gap-4">
        {prescriptions.map(([id, status, pharmacy, note]) => (
          <Card key={id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{id}</CardTitle>
                <CardDescription>{pharmacy}</CardDescription>
              </div>
              <Badge variant={status === "Approved" ? "default" : "secondary"}>{status}</Badge>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              {status === "Under review" ? <ClockIcon className="size-4" /> : <CheckCircle2Icon className="size-4" />}
              {note}
            </CardContent>
          </Card>
        ))}
      </section>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>New prescription</CardTitle>
          <CardDescription>Upload a clear image and choose pickup, proxy pickup, or delivery after review.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full">
            <UploadIcon data-icon="inline-start" />
            Upload
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
