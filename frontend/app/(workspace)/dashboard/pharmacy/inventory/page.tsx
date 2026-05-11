"use client"

import { CloudUploadIcon, Loader2Icon, PackageSearchIcon, PencilIcon, PlusIcon, TrashIcon, XIcon } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
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

const stockLabels = { in_stock: "In stock", low_stock: "Low stock", out_of_stock: "Out of stock" }
const stockVariants = { in_stock: "default", low_stock: "secondary", out_of_stock: "outline" } as const

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
            <Button disabled>
              <CloudUploadIcon data-icon="inline-start" />
              Batch update
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
