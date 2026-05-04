"use client"

import {
  ActivityIcon,
  BellIcon,
  ClipboardCheckIcon,
  Loader2Icon,
  PackageSearchIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getCurrentUser, type CurrentUser } from "@/lib/api"

export function RoleDashboard() {
  const [user, setUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    let active = true

    getCurrentUser().then((currentUser) => {
      if (active) setUser(currentUser)
    })

    return () => {
      active = false
    }
  }, [])

  if (!user?.profile) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
          Loading dashboard
        </div>
      </main>
    )
  }

  if (user.profile.role === "pharmacist") {
    return <PharmacistDashboard name={user.profile.fullName} />
  }

  if (user.profile.role === "admin") {
    return <OperationsDashboard name={user.profile.fullName} />
  }

  return <PatientDashboard name={user.profile.fullName} />
}

function PatientDashboard({ name }: { name: string }) {
  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <section className="rounded-lg border bg-card p-6">
        <Badge variant="secondary">Care dashboard</Badge>
        <h2 className="mt-4 font-[var(--font-display)] text-4xl font-semibold">Good morning, {name}</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Search medicine stock, upload prescriptions, and keep today&apos;s doses on schedule.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className={buttonVariants()} href="/dashboard/find">
            <PackageSearchIcon data-icon="inline-start" />
            Find medicine
          </Link>
          <Link className={buttonVariants({ variant: "outline" })} href="/dashboard/prescriptions">
            <ClipboardCheckIcon data-icon="inline-start" />
            Upload prescription
          </Link>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>67%</CardTitle><CardDescription>Today&apos;s adherence</CardDescription></CardHeader>
          <CardContent><Progress value={67} /></CardContent>
        </Card>
        <Card><CardHeader><CardTitle>3</CardTitle><CardDescription>Nearby pharmacies with matching stock</CardDescription></CardHeader></Card>
        <Card><CardHeader><CardTitle>1</CardTitle><CardDescription>Prescription under review</CardDescription></CardHeader></Card>
      </section>
    </main>
  )
}

function PharmacistDashboard({ name }: { name: string }) {
  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <section className="rounded-lg border bg-card p-6">
        <Badge variant="secondary">Pharmacy dashboard</Badge>
        <h2 className="mt-4 font-[var(--font-display)] text-4xl font-semibold">Inventory desk, {name}</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Keep stock current and respond to prescription requests before patients start calling branch by branch.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className={buttonVariants()} href="/dashboard/pharmacy/inventory">
            <ActivityIcon data-icon="inline-start" />
            Manage inventory
          </Link>
          <Link className={buttonVariants({ variant: "outline" })} href="/dashboard/pharmacy/requests">
            <BellIcon data-icon="inline-start" />
            Review requests
          </Link>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>1,240</CardTitle><CardDescription>Total SKUs</CardDescription></CardHeader></Card>
        <Card><CardHeader><CardTitle>14</CardTitle><CardDescription>Low stock items</CardDescription></CardHeader></Card>
        <Card><CardHeader><CardTitle>12</CardTitle><CardDescription>Pending requests</CardDescription></CardHeader></Card>
      </section>
    </main>
  )
}

function OperationsDashboard({ name }: { name: string }) {
  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <section className="rounded-lg border bg-card p-6">
        <Badge variant="secondary">Operations dashboard</Badge>
        <h2 className="mt-4 font-[var(--font-display)] text-4xl font-semibold">Operations review, {name}</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Review pharmacy access, monitor requests, and keep the medicine network trustworthy.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className={buttonVariants()} href="/dashboard/pharmacy/verification">
            <ShieldCheckIcon data-icon="inline-start" />
            Verify pharmacies
          </Link>
          <Link className={buttonVariants({ variant: "outline" })} href="/dashboard/pharmacy/requests">
            <UsersIcon data-icon="inline-start" />
            Monitor requests
          </Link>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>38</CardTitle><CardDescription>Registered pharmacies</CardDescription></CardHeader></Card>
        <Card><CardHeader><CardTitle>6</CardTitle><CardDescription>Awaiting verification</CardDescription></CardHeader></Card>
        <Card><CardHeader><CardTitle>412</CardTitle><CardDescription>Active patient accounts</CardDescription></CardHeader></Card>
      </section>
    </main>
  )
}
