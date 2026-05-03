import {
  BellIcon,
  BotIcon,
  CheckCircle2Icon,
  ClockIcon,
  FilterIcon,
  MapPinIcon,
  PackageCheckIcon,
  SearchIcon,
  SendIcon,
  UploadIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const medicines = [
  {
    name: "Amoxicillin Capsules",
    strength: "500mg",
    pharmacy: "Lion Pharmacy",
    neighborhood: "Bole",
    stock: "In stock",
    price: "185.00 ETB",
  },
  {
    name: "Metformin",
    strength: "850mg",
    pharmacy: "Wudassie Pharmacy",
    neighborhood: "Kazanchis",
    stock: "Low stock",
    price: "82.50 ETB",
  },
  {
    name: "Atorvastatin",
    strength: "20mg",
    pharmacy: "HealthPlus",
    neighborhood: "Piazza",
    stock: "In stock",
    price: "140.00 ETB",
  },
]

const inventory = [
  { name: "Amoxicillin 500mg", category: "Antibiotic", quantity: "450 units", expiry: "Oct 24, 2026" },
  { name: "Metformin 850mg", category: "Antidiabetic", quantity: "12 units", expiry: "May 15, 2026" },
  { name: "Paracetamol 500mg", category: "Analgesic", quantity: "1,200 units", expiry: "Jan 10, 2027" },
]

export default function Home() {
  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
            <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
              <div className="flex min-h-[320px] flex-col justify-between gap-8 rounded-lg border bg-card p-6 shadow-sm">
                <div className="flex flex-col gap-4">
                  <Badge variant="secondary" className="w-fit">
                    Verified pharmacy network
                  </Badge>
                  <div className="flex max-w-3xl flex-col gap-3">
                    <h2 className="font-[var(--font-display)] text-4xl font-semibold tracking-normal md:text-5xl">
                      Find the medicine first, choose pickup or delivery after.
                    </h2>
                    <p className="max-w-2xl text-muted-foreground">
                      Search across verified pharmacies, send a broadcast request when stock is unclear, and keep prescription review in one request trail.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="h-12 pl-10" placeholder="Search Insulin, Metformin, Amoxicillin..." />
                  </div>
                  <Button className="h-12">
                    <SearchIcon data-icon="inline-start" />
                    Search stock
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Today&apos;s adherence</CardTitle>
                    <CardDescription>2 of 3 doses confirmed</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <Progress value={67} />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Next dose</span>
                      <span className="font-medium">Atorvastatin, 8:00 PM</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Prescription review</CardTitle>
                    <CardDescription>Upload once, track every pharmacy response.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      <UploadIcon data-icon="inline-start" />
                      Upload prescription
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>Search results</CardTitle>
                    <CardDescription>Fast stock checks from nearby verified pharmacies.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <FilterIcon data-icon="inline-start" />
                    Filters
                  </Button>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {medicines.map((item) => (
                    <div key={`${item.name}-${item.pharmacy}`} className="rounded-lg border bg-background p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{item.name}</h3>
                            <Badge variant={item.stock === "In stock" ? "default" : "secondary"}>
                              {item.stock}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.strength}</p>
                          <p className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPinIcon className="size-4" />
                            {item.pharmacy}, {item.neighborhood}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span className="font-[var(--font-display)] text-xl font-semibold">{item.price}</span>
                          <Button size="sm">Contact</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="rounded-lg border border-dashed bg-secondary p-5 text-center">
                    <PackageCheckIcon className="mx-auto size-8 text-primary" />
                    <h3 className="mt-3 font-semibold">Can&apos;t find the exact stock?</h3>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                      Broadcast a request to pharmacies across Addis Ababa and get notified when one confirms availability.
                    </p>
                    <Button className="mt-4">
                      <SendIcon data-icon="inline-start" />
                      Send broadcast
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pharmacy inventory</CardTitle>
                  <CardDescription>Operational view for branch stock and request readiness.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medicine</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Expiry</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.map((item) => (
                        <TableRow key={item.name}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.expiry}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Request center</CardTitle>
                  <CardDescription>12 requests need pharmacy action.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><ClockIcon className="size-4" />Urgent review</span>
                    <Badge variant="secondary">4</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><CheckCircle2Icon className="size-4" />Approved today</span>
                    <Badge variant="secondary">8</Badge>
                  </div>
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>AI health assistant</CardTitle>
                  <CardDescription>Medication information with pharmacy context and a persistent safety disclaimer.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-[0.7fr_1.3fr]">
                  <div className="rounded-lg bg-secondary p-4 text-sm">
                    This assistant provides medicine information only and does not replace professional medical advice.
                  </div>
                  <div className="flex flex-col gap-3 rounded-lg border bg-background p-4">
                    <p className="text-sm text-muted-foreground">MAP Assistant</p>
                    <p>Three nearby pharmacies report Metformin in stock near Bole Medhanialem.</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Wudassie, 200m</Badge>
                      <Badge variant="outline">Lion, 450m</Badge>
                      <Badge variant="outline">HealthPlus, 900m</Badge>
                    </div>
                    <Button className="w-fit">
                      <BotIcon data-icon="inline-start" />
                      Open assistant
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
    </main>
  )
}
