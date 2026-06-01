"use client"

import { Building2Icon, CalendarIcon, InfoIcon, Loader2Icon, MapPinIcon, PackageSearchIcon, SendIcon, ShieldCheckIcon, SlidersHorizontalIcon, TruckIcon, XIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  createAvailabilityRequest,
  getMedicineSuggestions,
  getNeighborhoods,
  searchMedicines,
  type MedicineSearchResult,
  type MedicineSuggestion,
  type SearchFilters,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"

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

const popularSearches = ["Paracetamol", "Amoxicillin", "Ibuprofen", "Insulin"]

type UserLocation = {
  latitude: number
  longitude: number
}

type CollectionMethod = "pickup" | "delivery" | "proxy"

const collectionMethodLabels = {
  pickup: "Self pickup",
  delivery: "Delivery",
  proxy: "Proxy pickup",
} satisfies Record<CollectionMethod, string>

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) return `${distanceMeters}m away`
  return `${(distanceMeters / 1000).toFixed(1)}km away`
}

function formatExpiry(value: string | null) {
  if (!value) return "Expiry not listed"
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

function expiryHint(value: string | null) {
  if (!value) return "Ask the pharmacy to confirm batch expiry before purchase."
  const expiresAt = new Date(value).getTime()
  const days = Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000))
  if (days < 0) return "This stock is marked expired. Please request confirmation before visiting."
  if (days <= 90) return `Expires in about ${days} day${days === 1 ? "" : "s"}. Confirm suitability with the pharmacy.`
  return "Expiry looks comfortably ahead based on the pharmacy stock record."
}

export function MedicineSearch() {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<MedicineSuggestion[]>([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [searchedQuery, setSearchedQuery] = useState("")
  const [results, setResults] = useState<MedicineSearchResult[]>([])
  const [neighborhoods, setNeighborhoods] = useState<string[]>([])
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("")
  const [inStockOnly, setInStockOnly] = useState(false)
  const [deliveryOnly, setDeliveryOnly] = useState(false)
  const [underFiveHundred, setUnderFiveHundred] = useState(false)
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [collectionMethod, setCollectionMethod] = useState<CollectionMethod>("pickup")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [proxyName, setProxyName] = useState("")
  const [proxyPhone, setProxyPhone] = useState("")
  const [locating, setLocating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [selectedResult, setSelectedResult] = useState<MedicineSearchResult | null>(null)
  const [error, setError] = useState("")
  const [sheetError, setSheetError] = useState("")
  const [hasSearched, setHasSearched] = useState(false)

  // Load available neighborhoods for filter
  useEffect(() => {
    getNeighborhoods()
      .then((data) => setNeighborhoods(data.neighborhoods))
      .catch(() => {
        // Non-critical — filters still work without this
      })
  }, [])

  useEffect(() => {
    const trimmedQuery = query.trim()

    if (trimmedQuery.length < 2) {
      return
    }

    let active = true
    const timeout = window.setTimeout(() => {
      getMedicineSuggestions(trimmedQuery)
        .then((data) => {
          if (active) setSuggestions(data.suggestions)
        })
        .catch(() => {
          if (active) setSuggestions([])
        })
    }, 180)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [query])

  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      const matchesStock = inStockOnly ? item.stockStatus !== "out_of_stock" : true
      const matchesDelivery = deliveryOnly ? item.deliveryAvailable : true
      const matchesPrice = underFiveHundred ? item.priceEtb < 500 : true

      return matchesStock && matchesDelivery && matchesPrice
    })
  }, [deliveryOnly, inStockOnly, results, underFiveHundred])

  const activeFilterCount = [inStockOnly, deliveryOnly, underFiveHundred, !!selectedNeighborhood].filter(Boolean).length

  function captureCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Location comparison is not available in this browser.")
      return
    }

    setLocating(true)
    setError("")

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }

        setUserLocation(nextLocation)
        setLocating(false)
        if (hasSearched) void runSearch(searchedQuery || query, nextLocation)
      },
      () => {
        setError("Unable to read your current location. You can still compare by neighborhood.")
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  async function runSearch(overrideQuery?: string, overrideLocation?: UserLocation | null) {
    const searchQuery = overrideQuery ?? query
    const trimmedQuery = searchQuery.trim()
    const searchLocation = overrideLocation ?? userLocation

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
        inStock: inStockOnly || undefined,
        delivery: deliveryOnly || undefined,
        maxPrice: underFiveHundred ? 500 : undefined,
        latitude: searchLocation?.latitude,
        longitude: searchLocation?.longitude,
      }

      const response = await searchMedicines(filters)
      setResults(response.results)
      setSearchedQuery(trimmedQuery)
      setHasSearched(true)
      setSuggestionsOpen(false)
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

  function updateCollectionMethod(method: CollectionMethod) {
    setCollectionMethod(method)
    setError("")
    setSheetError("")
  }

  function getBroadcastDestination() {
    return collectionMethod === "delivery" ? "delivery-capable pharmacies" : "verified pharmacies"
  }

  function getRequestValidationMessage(target?: MedicineSearchResult) {
    if (collectionMethod === "delivery" && !deliveryAddress.trim()) {
      return "Enter a delivery address before sending a delivery request."
    }
    if (collectionMethod === "delivery" && target && !target.deliveryAvailable) {
      return "This pharmacy is pickup only. Switch to self pickup or proxy pickup, or send a broadcast delivery request."
    }
    if (collectionMethod === "proxy" && !proxyName.trim()) {
      return "Enter the proxy pickup name before sending the request."
    }
    return ""
  }

  async function sendAvailabilityRequest(target?: MedicineSearchResult) {
    const medicineName = (target?.medicine || searchedQuery || query).trim()
    if (!medicineName) return

    const validationMessage = getRequestValidationMessage(target)
    if (validationMessage) {
      if (target) setSheetError(validationMessage)
      else setError(validationMessage)
      return
    }

    setRequesting(true)
    setError("")
    setSheetError("")

    try {
      await createAvailabilityRequest({
        pharmacyId: target?.pharmacyId,
        medicineName,
        isDelivery: collectionMethod === "delivery",
        deliveryAddress: collectionMethod === "delivery" ? deliveryAddress.trim() : undefined,
        proxyName: collectionMethod === "proxy" ? proxyName.trim() : undefined,
        proxyPhone: collectionMethod === "proxy" ? proxyPhone.trim() || undefined : undefined,
        notes: target
          ? `Selected from search: ${target.pharmacy}, ${formatDistance(target.distanceMeters)}, ${target.priceEtb.toFixed(2)} ETB.`
          : selectedNeighborhood ? `Preferred neighborhood: ${selectedNeighborhood}` : undefined,
      })
      toast.success(
        "Request sent",
        target ? `Sent to ${target.pharmacy}.` : `Sent to ${getBroadcastDestination()}.`,
      )
    } catch {
      if (target) setSheetError("Unable to send this request to the selected pharmacy right now.")
      else setError("Unable to send this broadcast request right now.")
      toast.error("Request not sent", "Try again in a moment.")
    } finally {
      setRequesting(false)
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex flex-col gap-4">
        <form className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm" onSubmit={onSubmit}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-[var(--font-display)] text-xl font-semibold">Search verified stock</h2>
              <p className="mt-1 text-sm text-muted-foreground">Use the filters to narrow results before sending a request or visiting a branch.</p>
            </div>
            <Badge variant="outline">
              <ShieldCheckIcon className="mr-1 size-3" />
              Verified sources
            </Badge>
          </div>

          <div className="relative">
            <PackageSearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-12 pl-10"
              value={query}
              onChange={(event) => {
                const nextQuery = event.target.value
                setQuery(nextQuery)
                if (nextQuery.trim().length < 2) setSuggestions([])
                setSuggestionsOpen(true)
              }}
              onFocus={() => setSuggestionsOpen(true)}
              onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 100)}
              placeholder="Search by medicine name, brand, or category"
              aria-autocomplete="list"
              aria-expanded={suggestionsOpen && suggestions.length > 0}
              aria-controls="medicine-suggestions"
            />
            {suggestionsOpen && suggestions.length > 0 ? (
              <div
                id="medicine-suggestions"
                role="listbox"
                className="absolute left-0 right-0 top-14 z-20 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md"
              >
                {suggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.medicine}-${suggestion.category}`}
                    type="button"
                    role="option"
                    aria-selected={suggestion.query === query}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-secondary"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setQuery(suggestion.query)
                      setSuggestionsOpen(false)
                      void runSearch(suggestion.query)
                    }}
                  >
                    <span className="font-medium">{suggestion.medicine}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{suggestion.category}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Popular:</span>
            {popularSearches.map((term) => (
              <Button
                key={term}
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => {
                  setQuery(term)
                  void runSearch(term)
                }}
              >
                {term}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-2">
            <span className="inline-flex items-center gap-1 px-1 text-xs font-medium text-muted-foreground">
              <SlidersHorizontalIcon className="size-3.5" />
              Filters
            </span>
            {neighborhoods.length > 0 ? (
              <Select value={selectedNeighborhood || "all"} onValueChange={(value) => setSelectedNeighborhood(!value || value === "all" ? "" : value)}>
                <SelectTrigger size="sm" className="min-w-44">
                  <SelectValue placeholder="All neighborhoods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All neighborhoods</SelectItem>
                    {neighborhoods.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : null}

            <Button
              type="button"
              variant={inStockOnly ? "secondary" : "outline"}
              size="sm"
              className={cn(inStockOnly && "border-primary/60 bg-primary/15 text-primary shadow-[inset_0_0_0_1px_var(--primary)] hover:bg-primary/20 dark:bg-primary/20 dark:text-foreground")}
              onClick={() => setInStockOnly((value) => !value)}
            >
              In stock
            </Button>
            <Button
              type="button"
              variant={deliveryOnly ? "secondary" : "outline"}
              size="sm"
              className={cn(deliveryOnly && "border-primary/60 bg-primary/15 text-primary shadow-[inset_0_0_0_1px_var(--primary)] hover:bg-primary/20 dark:bg-primary/20 dark:text-foreground")}
              onClick={() => setDeliveryOnly((value) => !value)}
            >
              Delivery
            </Button>
            <Button
              type="button"
              variant={underFiveHundred ? "secondary" : "outline"}
              size="sm"
              className={cn(underFiveHundred && "border-primary/60 bg-primary/15 text-primary shadow-[inset_0_0_0_1px_var(--primary)] hover:bg-primary/20 dark:bg-primary/20 dark:text-foreground")}
              onClick={() => setUnderFiveHundred((value) => !value)}
            >
              Under 500 ETB
            </Button>
            <Button
              type="button"
              variant={userLocation ? "secondary" : "outline"}
              size="sm"
              className={cn(userLocation && "border-primary/60 bg-primary/15 text-primary shadow-[inset_0_0_0_1px_var(--primary)] hover:bg-primary/20 dark:bg-primary/20 dark:text-foreground")}
              disabled={locating}
              onClick={captureCurrentLocation}
            >
              {locating ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <MapPinIcon data-icon="inline-start" />}
              Current location
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
              {userLocation ? (
                <span>
                  {" "}near <span className="font-medium text-foreground">your current location</span>
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
            <Card key={item.id} className="overflow-hidden transition hover:border-primary/40 hover:shadow-sm">
              <div className="h-1 bg-primary/50" />
              <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant={stockColors[item.stockStatus]}>{stockLabels[item.stockStatus]}</Badge>
                    {item.deliveryAvailable ? <Badge variant="outline"><TruckIcon className="mr-1 size-3" />Delivery</Badge> : null}
                    <Badge variant="outline">{item.quantity} on hand</Badge>
                  </div>
                  <CardTitle className="leading-tight">{item.medicine}</CardTitle>
                  <CardDescription className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>{item.category}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPinIcon className="size-4" />
                      {item.pharmacy}, {item.neighborhood}
                    </span>
                  </CardDescription>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3 text-right">
                  <p className="text-xs text-muted-foreground">Unit price</p>
                  <p className="font-[var(--font-display)] text-2xl font-semibold">{item.priceEtb.toFixed(2)} ETB</p>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 border-t bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {formatDistance(item.distanceMeters)} · updated {item.updatedAt} · {formatExpiry(item.expiresAt)}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSheetError("")
                    setSelectedResult(item)
                  }}
                >
                  <InfoIcon data-icon="inline-start" />
                  View details
                </Button>
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
            <CardTitle>Broadcast stock request</CardTitle>
            <CardDescription>
              {collectionMethod === "delivery"
                ? "Delivery broadcasts go only to pharmacies marked as delivery-capable."
                : "Ask verified pharmacies to confirm stock for hard-to-find medicines."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">Collection method</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="availability-collection"
                  checked={collectionMethod === "pickup"}
                  onChange={() => updateCollectionMethod("pickup")}
                />
                Self pickup
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="availability-collection"
                  checked={collectionMethod === "delivery"}
                  onChange={() => updateCollectionMethod("delivery")}
                />
                Delivery
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="availability-collection"
                  checked={collectionMethod === "proxy"}
                  onChange={() => updateCollectionMethod("proxy")}
                />
                Proxy pickup
              </label>
            </fieldset>

            {collectionMethod === "delivery" ? (
              <label className="grid gap-1 text-sm font-medium">
                Delivery address
                <Input
                  value={deliveryAddress}
                  onChange={(event) => {
                    setDeliveryAddress(event.target.value)
                    setError("")
                    setSheetError("")
                  }}
                  placeholder="Street, building, or nearby landmark"
                />
              </label>
            ) : null}

            {collectionMethod === "proxy" ? (
              <div className="grid gap-2 rounded-lg border bg-muted/30 p-3">
                <label className="grid gap-1 text-sm font-medium">
                  Proxy name
                  <Input
                    value={proxyName}
                    onChange={(event) => {
                      setProxyName(event.target.value)
                      setError("")
                      setSheetError("")
                    }}
                    placeholder="Person collecting on your behalf"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  Proxy phone
                  <Input
                    type="tel"
                    value={proxyPhone}
                    onChange={(event) => {
                      setProxyPhone(event.target.value)
                      setError("")
                      setSheetError("")
                    }}
                    placeholder="+251XXXXXXXXX"
                  />
                </label>
              </div>
            ) : null}
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              This sends a {collectionMethodLabels[collectionMethod].toLowerCase()} request to {getBroadcastDestination()}.
            </div>
            <Button className="w-full" disabled={!(searchedQuery || query).trim() || requesting} onClick={() => void sendAvailabilityRequest()}>
              {requesting ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <SendIcon data-icon="inline-start" />}
              Send broadcast
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nearest</span>
                  <span className="font-medium">{formatDistance(Math.min(...results.map((r) => r.distanceMeters)))}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Sheet open={Boolean(selectedResult)} onOpenChange={(open) => { if (!open) { setSelectedResult(null); setSheetError("") } }}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {selectedResult ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedResult.medicine}</SheetTitle>
                <SheetDescription>More context to help you decide whether to visit, call, or send a request.</SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 px-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="text-xl font-semibold">{selectedResult.priceEtb.toFixed(2)} ETB</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">Stock on hand</p>
                    <p className="text-xl font-semibold">{selectedResult.quantity}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className="mt-2" variant={stockColors[selectedResult.stockStatus]}>{stockLabels[selectedResult.stockStatus]}</Badge>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">Distance</p>
                    <p className="mt-1 font-medium">{formatDistance(selectedResult.distanceMeters)}</p>
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/40 p-4 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <CalendarIcon className="size-4" />
                    {formatExpiry(selectedResult.expiresAt)}
                  </div>
                  <p className="mt-1 text-muted-foreground">{expiryHint(selectedResult.expiresAt)}</p>
                </div>

                <div className="grid gap-3 text-sm">
                  <div className="flex items-start gap-3 rounded-xl border p-3">
                    <Building2Icon className="mt-0.5 size-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{selectedResult.pharmacy}</p>
                      <p className="text-muted-foreground">{selectedResult.neighborhood}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border p-3">
                    <TruckIcon className="mt-0.5 size-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{selectedResult.deliveryAvailable ? "Delivery supported" : "Pickup recommended"}</p>
                      <p className="text-muted-foreground">Delivery support comes from the verified pharmacy profile. Confirm timing directly for urgent orders.</p>
                    </div>
                  </div>
                  <div className="rounded-xl border bg-primary/5 p-3 text-muted-foreground">
                    Updated {selectedResult.updatedAt}. Stock can change quickly, so call ahead or use a broadcast request when availability is critical.
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-3 text-muted-foreground">
                    This sends a {collectionMethodLabels[collectionMethod].toLowerCase()} request only to {selectedResult.pharmacy}.
                  </div>
                  {collectionMethod === "delivery" && !selectedResult.deliveryAvailable ? (
                    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                      This pharmacy is pickup only. Switch to self pickup or proxy pickup, or use the broadcast delivery request.
                    </div>
                  ) : null}
                  {sheetError ? <p className="text-sm text-destructive">{sheetError}</p> : null}
                  <Button type="button" disabled={requesting || (collectionMethod === "delivery" && !selectedResult.deliveryAvailable)} onClick={() => void sendAvailabilityRequest(selectedResult)}>
                    {requesting ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <SendIcon data-icon="inline-start" />}
                    Send to this pharmacy
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  )
}
