import { FilterIcon, MapPinIcon, PackageSearchIcon, SendIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const results = [
  ["Amoxicillin Capsules 500mg", "Lion Pharmacy", "Bole", "In stock", "185.00 ETB"],
  ["Metformin 850mg", "Wudassie Pharmacy", "Kazanchis", "Low stock", "82.50 ETB"],
  ["Insulin N", "Red Cross Pharmacy", "Arada", "In stock", "420.00 ETB"],
]

export default function FindMedicinePage() {
  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <section className="grid gap-4 lg:grid-cols-[0.75fr_0.25fr]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-5">
            <div className="relative">
              <PackageSearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-12 pl-10" placeholder="Search medicine, strength, or pharmacy" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm">In stock</Button>
              <Button variant="outline" size="sm">Delivery</Button>
              <Button variant="outline" size="sm">Under 500 ETB</Button>
              <Button variant="outline" size="sm">
                <FilterIcon data-icon="inline-start" />
                More filters
              </Button>
            </div>
          </div>
          {results.map(([medicine, pharmacy, neighborhood, stock, price]) => (
            <Card key={`${medicine}-${pharmacy}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{medicine}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPinIcon className="size-4" />
                    {pharmacy}, {neighborhood}
                  </CardDescription>
                </div>
                <Badge variant={stock === "In stock" ? "default" : "secondary"}>{stock}</Badge>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <span className="font-[var(--font-display)] text-2xl font-semibold">{price}</span>
                <div className="flex gap-2">
                  <Button variant="outline">Details</Button>
                  <Button>Contact</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Broadcast request</CardTitle>
            <CardDescription>Ask verified pharmacies to confirm stock for hard-to-find medicines.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <SendIcon data-icon="inline-start" />
              Send request
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
