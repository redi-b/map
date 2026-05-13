import { Clock3Icon, MapPinIcon, PackageSearchIcon, ShieldCheckIcon, SparklesIcon, TruckIcon } from "lucide-react"
import { MedicineSearch } from "@/components/map/medicine-search"
import { Card, CardContent } from "@/components/ui/card"

export default function FindMedicinePage() {
  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="grid gap-6 p-5 md:grid-cols-[1.2fr_0.8fr] md:p-6">
          <div className="flex flex-col justify-between gap-6">
            <div>
              <div className="mb-3 flex w-fit items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground">
                <PackageSearchIcon className="size-4 text-primary" />
                Verified pharmacy stock search
              </div>
              <h1 className="font-[var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">Find medicine with more confidence</h1>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
                Compare current stock, estimated distance, price, delivery support, and expiry guidance from verified pharmacies before you visit.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {([
                [ShieldCheckIcon, "Verified", "Only approved pharmacies appear"],
                [MapPinIcon, "Nearby", "Filter by neighborhood"],
                [TruckIcon, "Flexible", "Pickup or delivery indicators"],
              ] as const).map(([Icon, title, detail]) => (
                <div key={title} className="rounded-xl border bg-muted/30 p-3">
                  <Icon className="size-4 text-primary" />
                  <p className="mt-2 font-medium">{title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <CardContent className="grid gap-4 p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-background text-primary shadow-sm">
                  <SparklesIcon className="size-5" />
                </div>
                <div>
                  <p className="font-medium">How to get better results</p>
                  <p className="mt-1 text-sm text-muted-foreground">Search the generic name first, then try brand or strength if needed.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-background text-primary shadow-sm">
                  <Clock3Icon className="size-5" />
                </div>
                <div>
                  <p className="font-medium">Stock can change quickly</p>
                  <p className="mt-1 text-sm text-muted-foreground">Use the details panel or broadcast request for urgent or hard-to-find medicines.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <MedicineSearch />
    </main>
  )
}
