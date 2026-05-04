import { ShieldCheckIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const pharmacies = [
  ["Lion Pharmacy", "Bole", "Verified"],
  ["Unity Pharma", "Kazanchis", "Needs review"],
  ["HealthPlus", "Piazza", "Verified"],
]

export default function PharmacyVerificationPage() {
  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Pharmacy verification</CardTitle>
          <CardDescription>Pharmacy onboarding and license checks for verified participation.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {pharmacies.map(([name, neighborhood, status]) => (
            <div key={name} className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div>
                <h2 className="font-semibold">{name}</h2>
                <p className="text-sm text-muted-foreground">{neighborhood}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={status === "Verified" ? "default" : "secondary"}>{status}</Badge>
                <Button variant="outline" size="sm">
                  <ShieldCheckIcon data-icon="inline-start" />
                  Review
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  )
}
