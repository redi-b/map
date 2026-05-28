"use client"

import {
  AlertTriangleIcon,
  CalendarIcon,
  CheckCircle2Icon,
  CloudUploadIcon,
  EyeIcon,
  FileSpreadsheetIcon,
  HelpCircleIcon,
  Loader2Icon,
  PackageIcon,
  PackageSearchIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
  TrashIcon,
  XIcon,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { readSheet } from "read-excel-file/browser"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"

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

type AddInventoryErrors = Partial<Record<"medicineId" | "quantity" | "price", string>>

type EditableStockStatus = InventoryItem["stockStatus"] | "auto"

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

function toDateInput(value: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

function dateInputToIso(value: string) {
  return new Date(`${value}T00:00:00`).toISOString()
}

function formatDate(value: string | null) {
  if (!value) return "Not set"
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

function formatMoney(value: number) {
  return `${value.toFixed(2)} ETB`
}

function isExpiringSoon(item: InventoryItem, days = 90) {
  if (!item.expiresAt) return false
  const expiresAt = new Date(item.expiresAt).getTime()
  const now = Date.now()
  return expiresAt >= now && expiresAt <= now + days * 24 * 60 * 60 * 1000
}

function isExpired(item: InventoryItem) {
  return item.expiresAt ? new Date(item.expiresAt).getTime() < Date.now() : false
}

function medicineLabel(medicine: MedicineOption | InventoryItem["medicine"]) {
  return [medicine.name, medicine.strength, medicine.form ? `(${medicine.form})` : ""].filter(Boolean).join(" ")
}

export default function PharmacyInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [medicines, setMedicines] = useState<MedicineOption[]>([])
  const [search, setSearch] = useState("")
  const [stockFilter, setStockFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState("")
  const [editPrice, setEditPrice] = useState("")
  const [editStockStatus, setEditStockStatus] = useState<EditableStockStatus>("auto")
  const [editExpiresAt, setEditExpiresAt] = useState("")

  const [showAdd, setShowAdd] = useState(false)
  const [showImportGuide, setShowImportGuide] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [addMedicineId, setAddMedicineId] = useState("")
  const [addQuantity, setAddQuantity] = useState("")
  const [addPrice, setAddPrice] = useState("")
  const [addStockStatus, setAddStockStatus] = useState<EditableStockStatus>("auto")
  const [addExpiresAt, setAddExpiresAt] = useState("")
  const [addErrors, setAddErrors] = useState<AddInventoryErrors>({})
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<BatchImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const fetchInventory = useCallback(async (silent = false) => {
    try {
      if (silent) setRefreshing(true)
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (["in_stock", "low_stock", "out_of_stock"].includes(stockFilter)) params.set("stock", stockFilter)

      const response = await fetch(`${apiBaseUrl}/api/inventory?${params}`, {
        credentials: "include",
      })

      if (!response.ok) throw new Error("Failed to load inventory")
      const data = await response.json()
      setItems(data.items)
      setError("")
    } catch {
      setError("Unable to load inventory. Make sure the API is running.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [search, stockFilter])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchInventory()
    }, 150)

    return () => window.clearTimeout(timeout)
  }, [fetchInventory])

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/medicines/list`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setMedicines(data.medicines))
      .catch(() => {})
  }, [])

  const displayedItems = useMemo(() => {
    if (stockFilter === "expiring") return items.filter((item) => isExpiringSoon(item) || isExpired(item))
    return items
  }, [items, stockFilter])

  const stats = useMemo(() => {
    const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0)
    const value = items.reduce((sum, item) => sum + item.quantity * item.unitPriceEtb, 0)
    const lowStock = items.filter((item) => item.stockStatus === "low_stock").length
    const outOfStock = items.filter((item) => item.stockStatus === "out_of_stock").length
    const expiring = items.filter((item) => isExpiringSoon(item) || isExpired(item)).length

    return { total: items.length, totalUnits, value, lowStock, outOfStock, expiring }
  }, [items])

  function validateAddInventory() {
    const nextErrors: AddInventoryErrors = {}
    const quantity = Number(addQuantity)
    const price = Number(addPrice)

    if (!addMedicineId) nextErrors.medicineId = "Select a medicine."
    if (!addQuantity.trim()) nextErrors.quantity = "Enter the quantity."
    else if (!Number.isInteger(quantity) || quantity < 0) nextErrors.quantity = "Quantity must be a whole number, 0 or higher."
    if (!addPrice.trim()) nextErrors.price = "Enter the unit price."
    else if (!Number.isFinite(price) || price <= 0) nextErrors.price = "Price must be greater than 0."

    setAddErrors(nextErrors)
    return { isValid: Object.keys(nextErrors).length === 0, quantity, price }
  }

  function resetAddForm() {
    setShowAdd(false)
    setAddMedicineId("")
    setAddQuantity("")
    setAddPrice("")
    setAddStockStatus("auto")
    setAddExpiresAt("")
    setAddErrors({})
  }

  async function handleUpdate(itemId: string) {
    setSaving(true)
    setError("")
    const item = items.find((i) => i.id === itemId)
    const name = item ? medicineLabel(item.medicine) : "Item"

    try {
      const response = await fetch(`${apiBaseUrl}/api/inventory/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          quantity: editQuantity ? Number(editQuantity) : undefined,
          unitPriceEtb: editPrice ? Number(editPrice) : undefined,
          stockStatus: editStockStatus === "auto" ? undefined : editStockStatus,
          expiresAt: editExpiresAt ? dateInputToIso(editExpiresAt) : null,
        }),
      })

      if (!response.ok) throw new Error("Failed to update item")
      setEditingId(null)
      await fetchInventory(true)
      toast.success("Inventory updated", `${name} has been updated successfully.`)
    } catch {
      setError("Failed to update item. Check the values and try again.")
      toast.error("Update failed", `Failed to update ${name}. Check the values and try again.`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(itemId: string) {
    const item = items.find((i) => i.id === itemId)
    const name = item ? medicineLabel(item.medicine) : "Item"

    if (!confirm(`Remove ${name} from inventory?`)) return

    try {
      const response = await fetch(`${apiBaseUrl}/api/inventory/${itemId}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!response.ok) throw new Error("Failed to delete item")
      await fetchInventory(true)
      toast.success("Item removed", `${name} has been deleted from inventory.`)
    } catch {
      setError("Failed to delete item")
      toast.error("Deletion failed", `Failed to remove ${name} from inventory.`)
    }
  }

  async function handleAdd() {
    const validation = validateAddInventory()
    if (!validation.isValid) {
      toast.error("Validation failed", "Please correct the highlighted errors before saving.")
      return
    }

    setSaving(true)
    setError("")
    const medicine = medicines.find((m) => m.id === addMedicineId)
    const name = medicine ? medicineLabel(medicine) : "Item"

    try {
      const response = await fetch(`${apiBaseUrl}/api/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          medicineId: addMedicineId,
          quantity: validation.quantity,
          unitPriceEtb: validation.price,
          stockStatus: addStockStatus === "auto" ? undefined : addStockStatus,
          expiresAt: addExpiresAt ? dateInputToIso(addExpiresAt) : undefined,
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error ?? "Failed to add item")
      }

      resetAddForm()
      await fetchInventory(true)
      toast.success("Item added", `${name} has been added to inventory.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add item"
      setError(message)
      toast.error("Addition failed", message)
    } finally {
      setSaving(false)
    }
  }

  async function handleImport(file: File) {
    setImporting(true)
    setError("")
    setImportResult(null)

    try {
      const parsedItems = parseInventoryRows(await readSpreadsheetRecords(file))

      if (parsedItems.length === 0) {
        const msg = "No inventory rows found. Include medicine, quantity, and price columns."
        setError(msg)
        toast.error("Import failed", msg)
        return
      }

      const invalidRows = parsedItems
        .map((item, index) => ({ item, row: index + 2 }))
        .filter(({ item }) => !Number.isInteger(item.quantity) || item.quantity < 0 || !Number.isFinite(item.unitPriceEtb) || item.unitPriceEtb <= 0)

      if (invalidRows.length > 0) {
        const msg = `Check quantity and price values before importing. First issue is on row ${invalidRows[0].row}.`
        setError(msg)
        toast.error("Import failed", msg)
        return
      }

      const response = await fetch(`${apiBaseUrl}/api/inventory/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items: parsedItems satisfies BatchInventoryRow[] }),
      })

      const result = (await response.json()) as BatchImportResult
      setImportResult(result)

      if (response.ok) {
        if (result.skipped > 0 || (result.errors && result.errors.length > 0)) {
          toast.warning(
            "Import completed with warnings",
            `Imported ${result.imported} new, updated ${result.updated}, but skipped ${result.skipped} row(s) due to errors.`
          )
        } else {
          toast.success(
            "Import successful",
            `Successfully imported ${result.imported} new items and updated ${result.updated} existing items.`
          )
        }
      } else {
        if (result.errors?.length) {
          const msg = `Import finished with ${result.skipped} skipped row${result.skipped === 1 ? "" : "s"}.`
          setError(msg)
          toast.warning("Import warnings", msg)
        } else {
          const msg = "Import failed. Check the spreadsheet columns and try again."
          setError(msg)
          toast.error("Import failed", msg)
        }
      }

      await fetchInventory(true)
    } catch {
      const msg = "Unable to read this spreadsheet. Upload a CSV or XLSX file."
      setError(msg)
      toast.error("Import failed", msg)
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function startEdit(item: InventoryItem) {
    setEditingId(item.id)
    setEditQuantity(String(item.quantity))
    setEditPrice(String(item.unitPriceEtb))
    setEditStockStatus("auto")
    setEditExpiresAt(toDateInput(item.expiresAt))
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
      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PackageIcon className="size-4" />
            Pharmacy inventory
          </div>
          <h1 className="mt-2 font-[var(--font-display)] text-3xl font-semibold">Stock control center</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track stock health, expiry risk, pricing, and batch uploads for your active branch.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void fetchInventory(true)} disabled={refreshing}>
            {refreshing ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <RefreshCwIcon data-icon="inline-start" />}
            Refresh
          </Button>
          <Button onClick={() => setShowAdd((value) => !value)}>
            <PlusIcon data-icon="inline-start" />
            Add item
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Catalog items", value: stats.total, detail: `${stats.totalUnits} units on hand`, icon: PackageIcon },
          { label: "Inventory value", value: formatMoney(stats.value), detail: "Based on unit price", icon: CheckCircle2Icon },
          { label: "Low stock", value: stats.lowStock, detail: "Needs reorder review", icon: AlertTriangleIcon },
          { label: "Out of stock", value: stats.outOfStock, detail: "Unavailable to patients", icon: PackageSearchIcon },
          { label: "Expiry watch", value: stats.expiring, detail: "Expired or within 90 days", icon: CalendarIcon },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardHeader className="space-y-0 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardDescription>{stat.label}</CardDescription>
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-2xl">{stat.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{stat.detail}</p>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <Card>
        <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Inventory list</CardTitle>
            <CardDescription>Search, edit, import, and inspect stock lines. Status can be auto-calculated from quantity or manually set.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
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
            <Button variant="outline" onClick={() => setShowImportGuide(true)}>
              <HelpCircleIcon data-icon="inline-start" />
              Import guide
            </Button>
            <Button variant="outline" disabled={importing} onClick={() => fileInputRef.current?.click()}>
              {importing ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <CloudUploadIcon data-icon="inline-start" />}
              Import sheet
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_12rem]">
            <div className="relative">
              <PackageSearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-10" placeholder="Search by medicine name..." value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <Select value={stockFilter} onValueChange={(value) => setStockFilter(value ?? "all")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All stock</SelectItem>
                  <SelectItem value="in_stock">In stock</SelectItem>
                  <SelectItem value="low_stock">Low stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of stock</SelectItem>
                  <SelectItem value="expiring">Expiry watch</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {showAdd ? (
            <div className="grid gap-4 rounded-xl border bg-secondary/40 p-4 xl:grid-cols-[minmax(16rem,1.5fr)_8rem_8rem_10rem_10rem_auto_auto] xl:items-start">
              <label className="grid gap-1 text-sm font-medium">
                Medicine
                <Select
                  value={addMedicineId || "none"}
                  onValueChange={(value) => {
                    setAddMedicineId(!value || value === "none" ? "" : value)
                    setAddErrors((current) => ({ ...current, medicineId: undefined }))
                  }}
                >
                  <SelectTrigger className="w-full" aria-invalid={Boolean(addErrors.medicineId)} aria-describedby={addErrors.medicineId ? "add-medicine-error" : undefined}>
                    <SelectValue placeholder="Select medicine..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">Select medicine...</SelectItem>
                      {medicines.map((medicine) => (
                        <SelectItem key={medicine.id} value={medicine.id}>
                          {medicineLabel(medicine)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {addErrors.medicineId ? <span id="add-medicine-error" className="text-xs text-destructive">{addErrors.medicineId}</span> : null}
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Quantity
                <Input type="number" min="0" value={addQuantity} aria-invalid={Boolean(addErrors.quantity)} onChange={(event) => { setAddQuantity(event.target.value); setAddErrors((current) => ({ ...current, quantity: undefined })) }} />
                {addErrors.quantity ? <span className="text-xs text-destructive">{addErrors.quantity}</span> : null}
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Unit price
                <Input type="number" min="0" step="0.01" value={addPrice} aria-invalid={Boolean(addErrors.price)} onChange={(event) => { setAddPrice(event.target.value); setAddErrors((current) => ({ ...current, price: undefined })) }} />
                {addErrors.price ? <span className="text-xs text-destructive">{addErrors.price}</span> : null}
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Status
                <Select value={addStockStatus} onValueChange={(value) => setAddStockStatus((value ?? "auto") as EditableStockStatus)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="auto">Auto by quantity</SelectItem>
                      <SelectItem value="in_stock">In stock</SelectItem>
                      <SelectItem value="low_stock">Low stock</SelectItem>
                      <SelectItem value="out_of_stock">Out of stock</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Expiry date
                <Input type="date" value={addExpiresAt} onChange={(event) => setAddExpiresAt(event.target.value)} />
              </label>
              <Button className="xl:mt-6" onClick={handleAdd} disabled={saving}>
                {saving ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <SaveIcon data-icon="inline-start" />}
                Save
              </Button>
              <Button className="xl:mt-6" variant="ghost" size="icon" onClick={resetAddForm}>
                <XIcon />
              </Button>
            </div>
          ) : null}

          {error ? <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

          {importResult ? (
            <div className="rounded-xl border bg-muted/40 p-4 text-sm">
              <p className="font-medium">
                Imported {importResult.imported} new item{importResult.imported === 1 ? "" : "s"} and updated {importResult.updated}. {importResult.skipped ? `${importResult.skipped} skipped.` : "No skipped rows."}
              </p>
              {importResult.errors.length ? (
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {importResult.errors.slice(0, 4).map((item) => <li key={`${item.row}-${item.message}`}>Row {item.row}: {item.message}</li>)}
                  {importResult.errors.length > 4 ? <li>{importResult.errors.length - 4} more rows skipped.</li> : null}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No inventory items found for the current filters.
                    </TableCell>
                  </TableRow>
                ) : displayedItems.map((item) => {
                  const attention = item.stockStatus !== "in_stock" || isExpiringSoon(item) || isExpired(item)
                  return (
                    <TableRow key={item.id} className={cn(attention && "bg-amber-500/5")}>
                      <TableCell>
                        <div className="font-medium">{medicineLabel(item.medicine)}</div>
                        <div className="text-xs text-muted-foreground">{item.medicine.category}</div>
                      </TableCell>
                      <TableCell>
                        {editingId === item.id ? (
                          <Input className="h-8 w-24" type="number" min="0" value={editQuantity} onChange={(event) => setEditQuantity(event.target.value)} />
                        ) : (
                          <span className="font-medium">{item.quantity}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === item.id ? (
                          <Input className="h-8 w-28" type="number" min="0" step="0.01" value={editPrice} onChange={(event) => setEditPrice(event.target.value)} />
                        ) : formatMoney(item.unitPriceEtb)}
                      </TableCell>
                      <TableCell>
                        {editingId === item.id ? (
                          <Select value={editStockStatus} onValueChange={(value) => setEditStockStatus((value ?? "auto") as EditableStockStatus)}>
                            <SelectTrigger size="sm" className="w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectItem value="auto">Auto by quantity</SelectItem>
                                <SelectItem value="in_stock">In stock</SelectItem>
                                <SelectItem value="low_stock">Low stock</SelectItem>
                                <SelectItem value="out_of_stock">Out of stock</SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={stockVariants[item.stockStatus]}>{stockLabels[item.stockStatus]}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === item.id ? (
                          <Input className="h-8 w-36" type="date" value={editExpiresAt} onChange={(event) => setEditExpiresAt(event.target.value)} />
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span>{formatDate(item.expiresAt)}</span>
                            {isExpired(item) ? <Badge variant="destructive" className="w-fit">Expired</Badge> : isExpiringSoon(item) ? <Badge variant="secondary" className="w-fit">Soon</Badge> : null}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === item.id ? (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" onClick={() => void handleUpdate(item.id)} disabled={saving}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" onClick={() => setSelectedItem(item)}>
                              <EyeIcon />
                              <span className="sr-only">Details</span>
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => startEdit(item)}>
                              <PencilIcon />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => void handleDelete(item.id)}>
                              <TrashIcon />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={showImportGuide} onOpenChange={setShowImportGuide}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Batch upload guide</SheetTitle>
            <SheetDescription>Use CSV or XLSX files. Medicine can be matched by catalog id or by name plus optional form/strength.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 px-4 pb-4">
            <div className="rounded-xl border bg-muted/40 p-4">
              <div className="mb-3 flex items-center gap-2 font-medium">
                <FileSpreadsheetIcon className="size-4" />
                Recommended columns
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">medicine</span> or <span className="font-medium text-foreground">medicine_id</span> — required</p>
                <p><span className="font-medium text-foreground">form</span> and <span className="font-medium text-foreground">strength</span> — helpful when names are similar</p>
                <p><span className="font-medium text-foreground">quantity</span> — whole number, 0 or more</p>
                <p><span className="font-medium text-foreground">unit_price_etb</span> — positive number</p>
                <p><span className="font-medium text-foreground">stock_status</span> — optional: in_stock, low_stock, out_of_stock</p>
                <p><span className="font-medium text-foreground">expiry_date</span> — optional date, for example 2027-06-30</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>medicine</TableHead>
                    <TableHead>form</TableHead>
                    <TableHead>strength</TableHead>
                    <TableHead>quantity</TableHead>
                    <TableHead>unit_price_etb</TableHead>
                    <TableHead>stock_status</TableHead>
                    <TableHead>expiry_date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Amoxicillin</TableCell>
                    <TableCell>capsule</TableCell>
                    <TableCell>500mg</TableCell>
                    <TableCell>24</TableCell>
                    <TableCell>180</TableCell>
                    <TableCell>in_stock</TableCell>
                    <TableCell>2027-06-30</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Paracetamol</TableCell>
                    <TableCell>tablet</TableCell>
                    <TableCell>500mg</TableCell>
                    <TableCell>6</TableCell>
                    <TableCell>45</TableCell>
                    <TableCell>low_stock</TableCell>
                    <TableCell>2026-11-15</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <p className="text-sm text-muted-foreground">Tip: if a row says “multiple catalog matches”, add form or strength to make the medicine unique.</p>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(selectedItem)} onOpenChange={(open) => { if (!open) setSelectedItem(null) }}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {selectedItem ? (
            <>
              <SheetHeader>
                <SheetTitle>{medicineLabel(selectedItem.medicine)}</SheetTitle>
                <SheetDescription>Stock line details and suggested next actions.</SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 px-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">Quantity</p>
                    <p className="text-xl font-semibold">{selectedItem.quantity}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">Unit price</p>
                    <p className="text-xl font-semibold">{formatMoney(selectedItem.unitPriceEtb)}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className="mt-2" variant={stockVariants[selectedItem.stockStatus]}>{stockLabels[selectedItem.stockStatus]}</Badge>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">Expires</p>
                    <p className="mt-1 font-medium">{formatDate(selectedItem.expiresAt)}</p>
                  </div>
                </div>
                <div className="rounded-xl border bg-muted/40 p-4 text-sm">
                  <p className="font-medium">Helpful recommendation</p>
                  <p className="mt-1 text-muted-foreground">
                    {isExpired(selectedItem)
                      ? "This stock is past expiry. Remove it from available patient stock and follow disposal policy."
                      : isExpiringSoon(selectedItem)
                        ? "This item is near expiry. Consider prioritizing it for dispensing or lowering reorder volume."
                        : selectedItem.stockStatus === "out_of_stock"
                          ? "This item is unavailable to patients. Reorder or remove it if you no longer stock it."
                          : selectedItem.stockStatus === "low_stock"
                            ? "Stock is low. Review demand and reorder before it becomes unavailable."
                            : "Stock looks healthy. Keep quantity and expiry date updated after dispensing or receiving batches."}
                  </p>
                </div>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <div className="flex justify-between gap-3"><span>Category</span><span className="font-medium text-foreground">{selectedItem.medicine.category}</span></div>
                  <div className="flex justify-between gap-3"><span>Form</span><span className="font-medium text-foreground">{selectedItem.medicine.form}</span></div>
                  <div className="flex justify-between gap-3"><span>Last updated</span><span className="font-medium text-foreground">{formatDate(selectedItem.updatedAt)}</span></div>
                  <div className="flex justify-between gap-3"><span>Line value</span><span className="font-medium text-foreground">{formatMoney(selectedItem.quantity * selectedItem.unitPriceEtb)}</span></div>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </main>
  )
}
