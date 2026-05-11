"use client"

import { CloudUploadIcon, Loader2Icon, PackageSearchIcon, PencilIcon, PlusIcon, TrashIcon, XIcon } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { readSheet } from "read-excel-file/browser"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

type InventoryItem = {
  id: string
  medicine: { id: string; name: string; form: string; strength: string | null; category: string }
  quantity: number
  unitPriceEtb: number
  stockStatus: "in_stock" | "low_stock" | "out_of_stock"
  expiresAt: string | null
  updatedAt: string
}

type MedicineOption = {
  id: string
  name: string
  form: string
  strength: string | null
  category: string
}

type BatchInventoryRow = {
  medicineId?: string
  medicineName?: string
  form?: string
  strength?: string
  quantity: number
  unitPriceEtb: number
  stockStatus?: InventoryItem["stockStatus"]
  expiresAt?: string | null
}

type BatchImportResult = {
  imported: number
  updated: number
  skipped: number
  errors: Array<{ row: number; message: string }>
}

const stockLabels = { in_stock: "In stock", low_stock: "Low stock", out_of_stock: "Out of stock" }
const stockVariants = { in_stock: "default", low_stock: "secondary", out_of_stock: "outline" } as const

const headerAliases = {
  medicineId: ["medicineid", "medicine_id", "id"],
  medicineName: ["medicine", "medicine_name", "name"],
  form: ["form"],
  strength: ["strength", "dose"],
  quantity: ["quantity", "qty", "stock"],
  unitPriceEtb: ["unitpriceetb", "unit_price_etb", "unitprice", "unit_price", "price", "priceetb"],
  stockStatus: ["stockstatus", "stock_status", "status"],
  expiresAt: ["expiresat", "expires_at", "expiry", "expiration", "expirydate", "expiry_date"],
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_")
}

function readCell(row: Record<string, unknown>, aliases: string[]) {
  const match = Object.entries(row).find(([key]) => aliases.includes(normalizeHeader(key)))
  return match?.[1]
}

function readString(row: Record<string, unknown>, aliases: string[]) {
  const value = readCell(row, aliases)
  return value === undefined || value === null ? "" : String(value).trim()
}

function readNumber(row: Record<string, unknown>, aliases: string[]) {
  const value = readCell(row, aliases)
  if (typeof value === "number") return value
  const cleaned = String(value ?? "").replace(/,/g, "").trim()
  return cleaned ? Number(cleaned) : Number.NaN
}

function readStatus(row: Record<string, unknown>): InventoryItem["stockStatus"] | undefined {
  const value = readString(row, headerAliases.stockStatus).toLowerCase().replace(/[\s-]+/g, "_")
  if (value === "in_stock" || value === "low_stock" || value === "out_of_stock") return value
  return undefined
}

function readDate(row: Record<string, unknown>) {
  const value = readCell(row, headerAliases.expiresAt)
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function csvLineToCells(line: string) {
  const cells: string[] = []
  let current = ""
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    const next = line[index + 1]

    if (character === "\"" && quoted && next === "\"") {
      current += "\""
      index += 1
    } else if (character === "\"") {
      quoted = !quoted
    } else if (character === "," && !quoted) {
      cells.push(current.trim())
      current = ""
    } else {
      current += character
    }
  }

  cells.push(current.trim())
  return cells
}

function rowsToRecords(rows: unknown[][]) {
  const [headers = [], ...body] = rows
  const normalizedHeaders = headers.map((header) => String(header ?? "").trim())

  return body.map((cells) => {
    const row: Record<string, unknown> = {}
    normalizedHeaders.forEach((header, index) => {
      if (header) row[header] = cells[index] ?? ""
    })
    return row
  })
}

async function readSpreadsheetRecords(file: File) {
  if (file.name.toLowerCase().endsWith(".csv")) {
    const lines = (await file.text()).split(/\r?\n/).filter((line) => line.trim())
    return rowsToRecords(lines.map(csvLineToCells))
  }

  return rowsToRecords(await readSheet(file))
}

function parseInventoryRows(sheetRows: Array<Record<string, unknown>>): BatchInventoryRow[] {
  return sheetRows
    .map((row) => {
      const medicineId = readString(row, headerAliases.medicineId)
      const medicineName = readString(row, headerAliases.medicineName)
      const quantity = readNumber(row, headerAliases.quantity)
      const unitPriceEtb = readNumber(row, headerAliases.unitPriceEtb)

      return {
        medicineId: medicineId || undefined,
        medicineName: medicineName || undefined,
        form: readString(row, headerAliases.form) || undefined,
        strength: readString(row, headerAliases.strength) || undefined,
        quantity,
        unitPriceEtb,
        stockStatus: readStatus(row),
        expiresAt: readDate(row),
      }
    })
    .filter((row) => row.medicineId || row.medicineName || Number.isFinite(row.quantity) || Number.isFinite(row.unitPriceEtb))
}

export default function PharmacyInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [medicines, setMedicines] = useState<MedicineOption[]>([])
  const [search, setSearch] = useState("")
  const [stockFilter, setStockFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState("")
  const [editPrice, setEditPrice] = useState("")

  // Add state
  const [showAdd, setShowAdd] = useState(false)
  const [addMedicineId, setAddMedicineId] = useState("")
  const [addQuantity, setAddQuantity] = useState("")
  const [addPrice, setAddPrice] = useState("")
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<BatchImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const fetchInventory = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (stockFilter !== "all") params.set("stock", stockFilter)

      const response = await fetch(`${apiBaseUrl}/api/inventory?${params}`, {
        credentials: "include",
      })

      if (!response.ok) throw new Error("Failed to load inventory")
      const data = await response.json()
      setItems(data.items)
    } catch {
      setError("Unable to load inventory. Make sure the API is running.")
    } finally {
      setLoading(false)
    }
  }, [search, stockFilter])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchInventory()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [fetchInventory])

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/medicines/list`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setMedicines(data.medicines))
      .catch(() => {})
  }, [])

  const stats = {
    total: items.length,
    lowStock: items.filter((i) => i.stockStatus === "low_stock").length,
    outOfStock: items.filter((i) => i.stockStatus === "out_of_stock").length,
  }

  async function handleUpdate(itemId: string) {
    setSaving(true)
    try {
      await fetch(`${apiBaseUrl}/api/inventory/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          quantity: editQuantity ? Number(editQuantity) : undefined,
          unitPriceEtb: editPrice ? Number(editPrice) : undefined,
        }),
      })
      setEditingId(null)
      await fetchInventory()
    } catch {
      setError("Failed to update item")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(itemId: string) {
    if (!confirm("Remove this item from inventory?")) return

    try {
      await fetch(`${apiBaseUrl}/api/inventory/${itemId}`, {
        method: "DELETE",
        credentials: "include",
      })
      await fetchInventory()
    } catch {
      setError("Failed to delete item")
    }
  }

  async function handleAdd() {
    if (!addMedicineId || !addQuantity || !addPrice) return
    setSaving(true)

    try {
      await fetch(`${apiBaseUrl}/api/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          medicineId: addMedicineId,
          quantity: Number(addQuantity),
          unitPriceEtb: Number(addPrice),
        }),
      })
      setShowAdd(false)
      setAddMedicineId("")
      setAddQuantity("")
      setAddPrice("")
      await fetchInventory()
    } catch {
      setError("Failed to add item")
    } finally {
      setSaving(false)
    }
  }

  async function handleImport(file: File) {
    setImporting(true)
    setError("")
    setImportResult(null)

    try {
      const items = parseInventoryRows(await readSpreadsheetRecords(file))

      if (items.length === 0) {
        setError("No inventory rows found. Include medicine, quantity, and price columns.")
        return
      }

      const invalidRows = items
        .map((item, index) => ({ item, row: index + 2 }))
        .filter(({ item }) => !Number.isInteger(item.quantity) || item.quantity < 0 || !Number.isFinite(item.unitPriceEtb) || item.unitPriceEtb <= 0)

      if (invalidRows.length > 0) {
        setError(`Check quantity and price values before importing. First issue is on row ${invalidRows[0].row}.`)
        return
      }

      const response = await fetch(`${apiBaseUrl}/api/inventory/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items: items satisfies BatchInventoryRow[] }),
      })

      const result = (await response.json()) as BatchImportResult
      setImportResult(result)

      if (!response.ok && result.errors?.length) {
        setError(`Import finished with ${result.skipped} skipped row${result.skipped === 1 ? "" : "s"}.`)
      } else if (!response.ok) {
        setError("Import failed. Check the spreadsheet columns and try again.")
      }

      await fetchInventory()
    } catch {
      setError("Unable to read this spreadsheet. Upload a CSV or XLSX file.")
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function startEdit(item: InventoryItem) {
    setEditingId(item.id)
    setEditQuantity(String(item.quantity))
    setEditPrice(String(item.unitPriceEtb))
  }

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
          Loading inventory
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      {/* Summary cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{stats.total}</CardTitle>
            <CardDescription>Total items</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{stats.lowStock}</CardTitle>
            <CardDescription>Low stock items</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{stats.outOfStock}</CardTitle>
            <CardDescription>Out of stock</CardDescription>
          </CardHeader>
        </Card>
      </section>

      {/* Inventory table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Inventory</CardTitle>
            <CardDescription>Search and update stock for the active branch.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAdd((v) => !v)}>
              <PlusIcon data-icon="inline-start" />
              Add item
            </Button>
            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept=".csv,.xlsx"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handleImport(file)
              }}
            />
            <Button variant="outline" disabled={importing} onClick={() => fileInputRef.current?.click()}>
              {importing ? (
                <Loader2Icon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CloudUploadIcon data-icon="inline-start" />
              )}
              Import sheet
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <PackageSearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Search by medicine name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
            >
              <option value="all">All stock</option>
              <option value="in_stock">In stock</option>
              <option value="low_stock">Low stock</option>
              <option value="out_of_stock">Out of stock</option>
            </select>
          </div>

          {/* Add form */}
          {showAdd ? (
            <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-secondary/50 p-4">
              <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
                Medicine
                <select
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={addMedicineId}
                  onChange={(e) => setAddMedicineId(e.target.value)}
                >
                  <option value="">Select medicine...</option>
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.strength} ({m.form})
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex w-28 flex-col gap-1 text-sm font-medium">
                Quantity
                <Input type="number" min="0" value={addQuantity} onChange={(e) => setAddQuantity(e.target.value)} />
              </label>
              <label className="flex w-28 flex-col gap-1 text-sm font-medium">
                Price ETB
                <Input type="number" min="0" step="0.01" value={addPrice} onChange={(e) => setAddPrice(e.target.value)} />
              </label>
              <Button onClick={handleAdd} disabled={saving || !addMedicineId}>
                {saving ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : null}
                Add
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}>
                <XIcon />
              </Button>
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {importResult ? (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-medium">
                Imported {importResult.imported} new item{importResult.imported === 1 ? "" : "s"} and updated {importResult.updated}.
              </p>
              {importResult.errors.length ? (
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {importResult.errors.slice(0, 4).map((item) => (
                    <li key={`${item.row}-${item.message}`}>Row {item.row}: {item.message}</li>
                  ))}
                  {importResult.errors.length > 4 ? <li>{importResult.errors.length - 4} more rows skipped.</li> : null}
                </ul>
              ) : null}
            </div>
          ) : null}

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price ETB</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No inventory items found.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.medicine.name} {item.medicine.strength}
                      <p className="text-xs text-muted-foreground">{item.medicine.form}</p>
                    </TableCell>
                    <TableCell>{item.medicine.category}</TableCell>
                    <TableCell>
                      {editingId === item.id ? (
                        <Input
                          className="h-8 w-20"
                          type="number"
                          min="0"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(e.target.value)}
                        />
                      ) : (
                        item.quantity
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === item.id ? (
                        <Input
                          className="h-8 w-24"
                          type="number"
                          min="0"
                          step="0.01"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                        />
                      ) : (
                        item.unitPriceEtb.toFixed(2)
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={stockVariants[item.stockStatus]}>
                        {stockLabels[item.stockStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {editingId === item.id ? (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => handleUpdate(item.id)} disabled={saving}>
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(item)}>
                            <PencilIcon />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                            <TrashIcon />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  )
}
