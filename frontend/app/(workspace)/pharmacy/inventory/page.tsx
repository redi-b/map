import { CloudUploadIcon, PencilIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const rows = [
  ["Amoxicillin 500mg", "Antibiotic", "450 units", "185.00", "In stock"],
  ["Metformin 850mg", "Antidiabetic", "12 units", "82.50", "Low stock"],
  ["Paracetamol 500mg", "Analgesic", "1,200 units", "12.00", "In stock"],
  ["Omeprazole 20mg", "Gastrointestinal", "85 units", "210.00", "In stock"],
]

export default function PharmacyInventoryPage() {
  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>1,240</CardTitle><CardDescription>Total SKUs</CardDescription></CardHeader></Card>
        <Card><CardHeader><CardTitle>14</CardTitle><CardDescription>Low stock items</CardDescription></CardHeader></Card>
        <Card><CardHeader><CardTitle>12</CardTitle><CardDescription>Pending requests</CardDescription></CardHeader></Card>
      </section>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Inventory table</CardTitle>
            <CardDescription>Search and update stock for the active branch.</CardDescription>
          </div>
          <Button><CloudUploadIcon data-icon="inline-start" />Batch update</Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input placeholder="Search inventory by medicine name..." />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price ETB</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(([name, category, quantity, price, status]) => (
                <TableRow key={name}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell>{category}</TableCell>
                  <TableCell>{quantity}</TableCell>
                  <TableCell>{price}</TableCell>
                  <TableCell><Badge variant={status === "In stock" ? "default" : "secondary"}>{status}</Badge></TableCell>
                  <TableCell><Button variant="ghost" size="icon"><PencilIcon /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  )
}
