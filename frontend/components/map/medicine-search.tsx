"use client"

import { FilterIcon, Loader2Icon, MapPinIcon, PackageSearchIcon, SendIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { searchMedicines, type MedicineSearchResult } from "@/lib/api"

const initialSearchQuery = "amoxicillin"

const stockLabels = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
} satisfies Record<MedicineSearchResult["stockStatus"], string>

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) return `${distanceMeters}m away`
  return `${(distanceMeters / 1000).toFixed(1)}km away`
}

export function MedicineSearch() {
  const [query, setQuery] = useState(initialSearchQuery)
  const [searchedQuery, setSearchedQuery] = useState(initialSearchQuery)
  const [results, setResults] = useState<MedicineSearchResult[]>([])
  const [inStockOnly, setInStockOnly] = useState(true)
  const [deliveryOnly, setDeliveryOnly] = useState(false)
  const [underFiveHundred, setUnderFiveHundred] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let isMounted = true

    searchMedicines(initialSearchQuery)
      .then((response) => {
        if (!isMounted) return
        setResults(response.results)
      })
      .catch(() => {
        if (!isMounted) return
        setError("Search is temporarily unavailable.")
      })
      .finally(() => {
        if (!isMounted) return
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      const matchesStock = inStockOnly ? item.stockStatus !== "out_of_stock" : true
      const matchesDelivery = deliveryOnly ? item.deliveryAvailable : true
      const matchesPrice = underFiveHundred ? item.priceEtb < 500 : true

      return matchesStock && matchesDelivery && matchesPrice
    })
  }, [deliveryOnly, inStockOnly, results, underFiveHundred])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedQuery = query.trim()

    if (trimmedQuery.length < 2) {
      setError("Enter at least 2 characters to search.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await searchMedicines(trimmedQuery)
      setResults(response.results)
      setSearchedQuery(trimmedQuery)
    } catch {
      setError("Search is temporarily unavailable.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex flex-col gap-4">
        <form className="flex flex-col gap-3 rounded-lg border bg-card p-5" onSubmit={onSubmit}>
          <div className="relative">
            <PackageSearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-12 pl-10"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search medicine, strength, or pharmacy"
            />
          </div>
          <div className="flex flex-wrap gap-2">
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
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : null}
              Search
            </Button>
            <Button type="button" variant="outline" size="sm">
              <FilterIcon data-icon="inline-start" />
              More filters
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </form>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {filteredResults.length} result{filteredResults.length === 1 ? "" : "s"} for{" "}
            <span className="font-medium text-foreground">{searchedQuery}</span>
          </p>
        </div>

        {filteredResults.length ? (
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
                <Badge variant={item.stockStatus === "in_stock" ? "default" : "secondary"}>
                  {stockLabels[item.stockStatus]}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="font-[var(--font-display)] text-2xl font-semibold">
                    {item.priceEtb.toFixed(2)} ETB
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {formatDistance(item.distanceMeters)} / updated {item.updatedAt}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">Details</Button>
                  <Button>Contact</Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No matching results</CardTitle>
              <CardDescription>
                Try another medicine name or send a request so pharmacies can confirm stock.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Broadcast request</CardTitle>
          <CardDescription>
            Ask verified pharmacies to confirm stock for hard-to-find medicines.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" disabled={!query.trim()}>
            <SendIcon data-icon="inline-start" />
            Send request
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
