"use client"

import { FilterIcon, Loader2Icon, MapPinIcon, PackageSearchIcon, SendIcon, XIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createAvailabilityRequest, getNeighborhoods, searchMedicines, type MedicineSearchResult, type SearchFilters } from "@/lib/api"

const stockLabels = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
} satisfies Record<MedicineSearchResult["stockStatus"], string>

const stockColors = {
  in_stock: "default",
  low_stock: "secondary",
  out_of_stock: "outline",
} as const

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) return `${distanceMeters}m away`
  return `${(distanceMeters / 1000).toFixed(1)}km away`
}

export function MedicineSearch() {
  const [query, setQuery] = useState("")
  const [searchedQuery, setSearchedQuery] = useState("")
  const [results, setResults] = useState<MedicineSearchResult[]>([])
  const [neighborhoods, setNeighborhoods] = useState<string[]>([])
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("")
  const [inStockOnly, setInStockOnly] = useState(false)
  const [deliveryOnly, setDeliveryOnly] = useState(false)
  const [underFiveHundred, setUnderFiveHundred] = useState(false)
  const [loading, setLoading] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState("")
  const [requestMessage, setRequestMessage] = useState("")
  const [hasSearched, setHasSearched] = useState(false)

  // Load available neighborhoods for filter
  useEffect(() => {
    getNeighborhoods()
      .then((data) => setNeighborhoods(data.neighborhoods))
      .catch(() => {
        // Non-critical — filters still work without this
      })
  }, [])

  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      const matchesStock = inStockOnly ? item.stockStatus !== "out_of_stock" : true
      const matchesDelivery = deliveryOnly ? item.deliveryAvailable : true
      const matchesPrice = underFiveHundred ? item.priceEtb < 500 : true

      return matchesStock && matchesDelivery && matchesPrice
    })
  }, [deliveryOnly, inStockOnly, results, underFiveHundred])

  const activeFilterCount = [inStockOnly, deliveryOnly, underFiveHundred, !!selectedNeighborhood].filter(Boolean).length

  async function runSearch(overrideQuery?: string) {
    const searchQuery = overrideQuery ?? query
    const trimmedQuery = searchQuery.trim()

    if (trimmedQuery.length < 2) {
      setError("Enter at least 2 characters to search.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const filters: SearchFilters = {
        q: trimmedQuery,
        neighborhood: selectedNeighborhood || undefined,
      }

      const response = await searchMedicines(filters)
      setResults(response.results)
      setSearchedQuery(trimmedQuery)
      setHasSearched(true)
    } catch {
      setError("Search is temporarily unavailable. Make sure the API is running.")
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    runSearch()
  }

  function clearFilters() {
    setInStockOnly(false)
    setDeliveryOnly(false)
    setUnderFiveHundred(false)
    setSelectedNeighborhood("")
  }

  async function sendAvailabilityRequest() {
    const medicineName = (searchedQuery || query).trim()
    if (!medicineName) return

    setRequesting(true)
    setError("")
    setRequestMessage("")

    try {
      await createAvailabilityRequest({
        medicineName,
        notes: selectedNeighborhood ? `Preferred neighborhood: ${selectedNeighborhood}` : undefined,
      })
      setRequestMessage("Request sent. Pharmacies can now respond from their queue.")
    } catch {
      setError("Unable to send this request right now.")
    } finally {
      setRequesting(false)
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex flex-col gap-4">
        {/* Search bar */}
        <form className="flex flex-col gap-3 rounded-lg border bg-card p-5" onSubmit={onSubmit}>
          <div className="relative">
            <PackageSearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-12 pl-10"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by medicine name, brand, or category"
            />
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2">
            {neighborhoods.length > 0 ? (
              <select
                className="h-8 rounded-md border bg-background px-3 text-sm"
                value={selectedNeighborhood}
                onChange={(event) => {
                  setSelectedNeighborhood(event.target.value)
                }}
              >
                <option value="">All neighborhoods</option>
                {neighborhoods.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            ) : null}

            <Button
              type="button"
              variant={inStockOnly ? "secondary" : "outline"}
              size="sm"
              onClick={() => setInStockOnly((value) => !value)}
            >
              In stock
            </Button>
            <Button
              type="button"
              variant={deliveryOnly ? "secondary" : "outline"}
              size="sm"
              onClick={() => setDeliveryOnly((value) => !value)}
            >
              Delivery
            </Button>
            <Button
              type="button"
              variant={underFiveHundred ? "secondary" : "outline"}
              size="sm"
              onClick={() => setUnderFiveHundred((value) => !value)}
            >
              Under 500 ETB
            </Button>

            {activeFilterCount > 0 ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                <XIcon data-icon="inline-start" />
                Clear ({activeFilterCount})
              </Button>
            ) : null}

            <div className="flex-1" />

            <Button type="submit" size="sm" disabled={loading}>
              {loading ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : null}
              Search
            </Button>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {requestMessage ? <p className="text-sm text-primary">{requestMessage}</p> : null}
        </form>

        {/* Results header */}
        {hasSearched ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {filteredResults.length} result{filteredResults.length === 1 ? "" : "s"} for{" "}
              <span className="font-medium text-foreground">{searchedQuery}</span>
              {selectedNeighborhood ? (
                <span>
                  {" "}in <span className="font-medium text-foreground">{selectedNeighborhood}</span>
                </span>
              ) : null}
            </p>
          </div>
        ) : null}

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
            <Loader2Icon className="size-5 animate-spin" />
            Searching pharmacies...
          </div>
        ) : hasSearched && filteredResults.length > 0 ? (
          filteredResults.map((item) => (
            <Card key={item.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{item.medicine}</CardTitle>
                  <CardDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>{item.category}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPinIcon className="size-4" />
                      {item.pharmacy}, {item.neighborhood}
                    </span>
                  </CardDescription>
                </div>
                <Badge variant={stockColors[item.stockStatus]}>
                  {stockLabels[item.stockStatus]}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="font-[var(--font-display)] text-2xl font-semibold">
                    {item.priceEtb.toFixed(2)} ETB
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {formatDistance(item.distanceMeters)} · updated {item.updatedAt}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">Details</Button>
                  <Button>Contact</Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : hasSearched ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <PackageSearchIcon className="size-5 text-muted-foreground" />
                <div>
                  <CardTitle>No matching results</CardTitle>
                  <CardDescription className="mt-1">
                    No pharmacies currently stock &quot;{searchedQuery}&quot;.
                    Try a different name or send a broadcast request.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <PackageSearchIcon className="size-10 text-muted-foreground" />
              <div>
                <p className="font-medium">Search for a medicine to get started</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter a medicine name, brand, or category above to find nearby pharmacies with stock.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar */}
      <div className="flex flex-col gap-4">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Broadcast request</CardTitle>
            <CardDescription>
              Ask verified pharmacies to confirm stock for hard-to-find medicines.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" disabled={!(searchedQuery || query).trim() || requesting} onClick={() => void sendAvailabilityRequest()}>
              {requesting ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <SendIcon data-icon="inline-start" />}
              Send request
            </Button>
          </CardContent>
        </Card>

        {hasSearched && results.length > 0 ? (
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Search summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total results</span>
                  <span className="font-medium">{results.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">After filters</span>
                  <span className="font-medium">{filteredResults.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">In stock</span>
                  <span className="font-medium">
                    {results.filter((r) => r.stockStatus === "in_stock").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg. price</span>
                  <span className="font-medium">
                    {(results.reduce((sum, r) => sum + r.priceEtb, 0) / results.length).toFixed(0)} ETB
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  )
}
