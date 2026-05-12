import { desc, eq, isNull, or } from "drizzle-orm"
import { db } from "../db/client.js"
import {
  availabilityRequests,
  inventoryItems,
  medicines,
  pharmacies,
  prescriptions,
  profiles,
} from "../db/schema.js"
import type { CurrentProfile } from "../lib/auth-context.js"
import { listTodayAdherence } from "./adherence.js"
import { getPharmacyForStaff } from "./inventory.js"
import { listNotifications } from "./notification.js"

type IconName = "activity" | "bell" | "clipboard" | "package" | "shield" | "trend" | "users"

type Kpi = {
  label: string
  value: string
  detail: string
  icon: IconName
}

type ChartSeries = {
  title: string
  description: string
  kind: "area" | "bar"
  firstKey: string
  secondKey: string
  firstLabel: string
  secondLabel: string
  firstColor: string
  secondColor: string
  data: Array<Record<string, string | number>>
}

type RingDatum = {
  label: string
  value: number
  maxValue: number
  color: string
}

type DetailRow = {
  label: string
  detail: string
  badge: string
}

export type DashboardSummary = {
  role: CurrentProfile["role"]
  hero: {
    badge: string
    title: string
    description: string
    primaryHref: string
    primaryLabel: string
    primaryIcon: IconName
    secondaryHref: string
    secondaryLabel: string
    secondaryIcon: IconName
  }
  kpis: Kpi[]
  chart: ChartSeries
  ring: {
    title: string
    description: string
    data: RingDatum[]
  }
  lists: Array<{
    title: string
    description: string
    rows: DetailRow[]
    empty: string
  }>
}

const openPrescriptionStatuses = new Set(["uploaded", "under_review"])
const openAvailabilityStatuses = new Set(["submitted", "under_review"])

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: value >= 1000 ? "compact" : "standard" }).format(value)
}

function statusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function todayStart() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return start
}

function weekStart() {
  const start = todayStart()
  start.setDate(start.getDate() - 6)
  return start
}

function localDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}

function weekSkeleton(firstKey: string, secondKey: string) {
  const start = weekStart()

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)

    return {
      key: localDateKey(day),
      day: new Intl.DateTimeFormat("en", { weekday: "short" }).format(day),
      [firstKey]: 0,
      [secondKey]: 0,
    } as Record<string, string | number>
  })
}

function addToSeries(
  series: Array<Record<string, string | number>>,
  date: Date,
  key: string,
) {
  const dayKey = localDateKey(date)
  const item = series.find((entry) => entry.key === dayKey)
  if (item) {
    item[key] = Number(item[key]) + 1
  }
}

function stripSeriesKeys(series: Array<Record<string, string | number>>) {
  return series.map(({ key: _key, ...entry }) => entry)
}

function latestRows<T extends { createdAt: Date }>(rows: T[], limit = 3) {
  return [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit)
}

export async function getDashboardSummary(profile: CurrentProfile): Promise<DashboardSummary> {
  if (profile.role === "pharmacist") return getPharmacistDashboard(profile)
  if (profile.role === "admin") return getOperationsDashboard(profile)
  return getPatientDashboard(profile)
}

async function getPatientDashboard(profile: CurrentProfile): Promise<DashboardSummary> {
  const [adherence, patientPrescriptions, patientAvailabilityRequests, notifications] = await Promise.all([
    listTodayAdherence(profile.id),
    db
      .select({
        id: prescriptions.id,
        status: prescriptions.status,
        notes: prescriptions.notes,
        createdAt: prescriptions.createdAt,
        pharmacyName: pharmacies.name,
      })
      .from(prescriptions)
      .innerJoin(pharmacies, eq(prescriptions.pharmacyId, pharmacies.id))
      .where(eq(prescriptions.patientProfileId, profile.id))
      .orderBy(desc(prescriptions.createdAt)),
    db
      .select({
        id: availabilityRequests.id,
        medicineName: availabilityRequests.medicineName,
        status: availabilityRequests.status,
        notes: availabilityRequests.notes,
        createdAt: availabilityRequests.createdAt,
        pharmacyName: pharmacies.name,
      })
      .from(availabilityRequests)
      .leftJoin(pharmacies, eq(availabilityRequests.pharmacyId, pharmacies.id))
      .where(eq(availabilityRequests.patientProfileId, profile.id))
      .orderBy(desc(availabilityRequests.createdAt)),
    listNotifications(profile.id, 5),
  ])

  const openPrescriptions = patientPrescriptions.filter((item) => openPrescriptionStatuses.has(item.status)).length
  const openAvailabilityRequests = patientAvailabilityRequests.filter((item) => openAvailabilityStatuses.has(item.status)).length
  const series = weekSkeleton("requests", "doses")

  for (const item of patientPrescriptions) addToSeries(series, item.createdAt, "requests")
  for (const item of patientAvailabilityRequests) addToSeries(series, item.createdAt, "requests")
  for (const dose of adherence.doses) addToSeries(series, new Date(dose.scheduledAt), "doses")

  const requestRows = latestRows([
    ...patientPrescriptions.map((item) => ({
      label: item.pharmacyName,
      detail: item.notes || "Prescription request",
      badge: statusLabel(item.status),
      createdAt: item.createdAt,
    })),
    ...patientAvailabilityRequests.map((item) => ({
      label: item.medicineName,
      detail: item.pharmacyName ? `Availability request at ${item.pharmacyName}` : "Availability request sent to pharmacies",
      badge: statusLabel(item.status),
      createdAt: item.createdAt,
    })),
  ])

  return {
    role: "patient",
    hero: {
      badge: "Patient dashboard",
      title: `Good morning, ${profile.fullName}`,
      description: "Search nearby medicine stock, keep prescriptions moving, and track the care tasks that need attention today.",
      primaryHref: "/dashboard/find",
      primaryLabel: "Find medicine",
      primaryIcon: "package",
      secondaryHref: "/dashboard/prescriptions",
      secondaryLabel: "Upload prescription",
      secondaryIcon: "clipboard",
    },
    kpis: [
      {
        label: "Today",
        value: `${adherence.summary.progress}%`,
        detail: `${adherence.summary.taken} of ${adherence.summary.total} doses marked`,
        icon: "activity",
      },
      {
        label: "Open requests",
        value: compactNumber(openPrescriptions + openAvailabilityRequests),
        detail: "Prescriptions and availability checks awaiting a response",
        icon: "package",
      },
      {
        label: "Prescriptions",
        value: compactNumber(patientPrescriptions.length),
        detail: `${openPrescriptions} currently under review`,
        icon: "clipboard",
      },
      {
        label: "Reminders",
        value: compactNumber(adherence.summary.upcoming),
        detail: `${adherence.summary.refillAlerts} refill alerts from active reminders`,
        icon: "bell",
      },
    ],
    chart: {
      title: "Care activity",
      description: "Requests and scheduled doses across the last 7 days.",
      kind: "area",
      firstKey: "requests",
      secondKey: "doses",
      firstLabel: "Requests",
      secondLabel: "Doses",
      firstColor: "var(--chart-1)",
      secondColor: "var(--chart-2)",
      data: stripSeriesKeys(series),
    },
    ring: {
      title: "Today's care plan",
      description: "Progress across the main tasks for today.",
      data: [
        { label: "Doses", value: adherence.summary.taken, maxValue: Math.max(1, adherence.summary.total), color: "var(--chart-1)" },
        {
          label: "Prescriptions",
          value: patientPrescriptions.filter((item) => item.status === "verified").length,
          maxValue: Math.max(1, patientPrescriptions.length),
          color: "var(--chart-2)",
        },
        {
          label: "Availability",
          value: patientAvailabilityRequests.filter((item) => item.status === "approved").length,
          maxValue: Math.max(1, patientAvailabilityRequests.length),
          color: "var(--chart-3)",
        },
      ],
    },
    lists: [
      {
        title: "Needs attention",
        description: "Recent updates and next care tasks.",
        rows: notifications.slice(0, 3).map((item) => ({
          label: item.source === "system" ? "Account update" : statusLabel(item.source),
          detail: item.message,
          badge: item.isRead ? "Read" : "New",
        })),
        empty: "No updates need attention right now.",
      },
      {
        title: "Request history",
        description: "The latest prescription and availability activity.",
        rows: requestRows.map(({ createdAt: _createdAt, ...row }) => row),
        empty: "No prescription or availability requests yet.",
      },
    ],
  }
}

async function getPharmacistDashboard(profile: CurrentProfile): Promise<DashboardSummary> {
  const pharmacyId = await getPharmacyForStaff(profile.id)

  if (!pharmacyId) {
    return emptyPharmacistDashboard(profile.fullName)
  }

  const [inventoryRows, prescriptionRows, availabilityRows] = await Promise.all([
    db
      .select({
        id: inventoryItems.id,
        quantity: inventoryItems.quantity,
        stockStatus: inventoryItems.stockStatus,
        expiresAt: inventoryItems.expiresAt,
        updatedAt: inventoryItems.updatedAt,
        medicineName: medicines.name,
        medicineStrength: medicines.strength,
      })
      .from(inventoryItems)
      .innerJoin(medicines, eq(inventoryItems.medicineId, medicines.id))
      .where(eq(inventoryItems.pharmacyId, pharmacyId))
      .orderBy(desc(inventoryItems.updatedAt)),
    db
      .select({
        id: prescriptions.id,
        status: prescriptions.status,
        notes: prescriptions.notes,
        createdAt: prescriptions.createdAt,
        updatedAt: prescriptions.updatedAt,
        patientName: profiles.fullName,
      })
      .from(prescriptions)
      .innerJoin(profiles, eq(prescriptions.patientProfileId, profiles.id))
      .where(eq(prescriptions.pharmacyId, pharmacyId))
      .orderBy(desc(prescriptions.createdAt)),
    db
      .select({
        id: availabilityRequests.id,
        medicineName: availabilityRequests.medicineName,
        status: availabilityRequests.status,
        notes: availabilityRequests.notes,
        createdAt: availabilityRequests.createdAt,
        updatedAt: availabilityRequests.updatedAt,
        patientName: profiles.fullName,
      })
      .from(availabilityRequests)
      .innerJoin(profiles, eq(availabilityRequests.patientProfileId, profiles.id))
      .where(or(eq(availabilityRequests.pharmacyId, pharmacyId), isNull(availabilityRequests.pharmacyId)))
      .orderBy(desc(availabilityRequests.createdAt)),
  ])

  const today = todayStart()
  const openPrescriptions = prescriptionRows.filter((item) => openPrescriptionStatuses.has(item.status))
  const openAvailability = availabilityRows.filter((item) => openAvailabilityStatuses.has(item.status))
  const completedToday =
    prescriptionRows.filter((item) => item.status === "verified" && item.updatedAt >= today).length +
    availabilityRows.filter((item) => item.status === "approved" && item.updatedAt >= today).length
  const series = weekSkeleton("submitted", "completed")

  for (const item of prescriptionRows) {
    addToSeries(series, item.createdAt, "submitted")
    if (item.status === "verified") addToSeries(series, item.updatedAt, "completed")
  }
  for (const item of availabilityRows) {
    addToSeries(series, item.createdAt, "submitted")
    if (item.status === "approved") addToSeries(series, item.updatedAt, "completed")
  }

  const requestRows = latestRows([
    ...openPrescriptions.map((item) => ({
      label: item.patientName,
      detail: item.notes || "Prescription request",
      badge: statusLabel(item.status),
      createdAt: item.createdAt,
    })),
    ...openAvailability.map((item) => ({
      label: item.patientName,
      detail: item.medicineName,
      badge: statusLabel(item.status),
      createdAt: item.createdAt,
    })),
  ])
  const expiringSoon = new Date()
  expiringSoon.setDate(expiringSoon.getDate() + 30)
  const watchRows = inventoryRows
    .filter((item) => item.stockStatus !== "in_stock" || (item.expiresAt !== null && item.expiresAt <= expiringSoon))
    .slice(0, 3)

  return {
    role: "pharmacist",
    hero: {
      badge: "Pharmacy dashboard",
      title: `Inventory desk, ${profile.fullName}`,
      description: "Keep branch stock current, prioritize requests, and spot demand changes before patients call branch by branch.",
      primaryHref: "/dashboard/pharmacy/inventory",
      primaryLabel: "Manage inventory",
      primaryIcon: "activity",
      secondaryHref: "/dashboard/pharmacy/requests",
      secondaryLabel: "Review requests",
      secondaryIcon: "bell",
    },
    kpis: [
      { label: "Total SKUs", value: compactNumber(inventoryRows.length), detail: "Items in active branch inventory", icon: "activity" },
      {
        label: "Low stock",
        value: compactNumber(inventoryRows.filter((item) => item.stockStatus === "low_stock").length),
        detail: "Need reorder review",
        icon: "package",
      },
      { label: "Pending", value: compactNumber(openPrescriptions.length + openAvailability.length), detail: "Requests waiting on response", icon: "bell" },
      { label: "Filled today", value: compactNumber(completedToday), detail: "Completed pickup or delivery responses", icon: "clipboard" },
    ],
    chart: {
      title: "Request flow",
      description: "Submitted versus completed patient requests.",
      kind: "bar",
      firstKey: "submitted",
      secondKey: "completed",
      firstLabel: "Submitted",
      secondLabel: "Completed",
      firstColor: "var(--chart-1)",
      secondColor: "var(--chart-2)",
      data: stripSeriesKeys(series),
    },
    ring: {
      title: "Stock health",
      description: "Current inventory readiness by stock status.",
      data: [
        { label: "In stock", value: inventoryRows.filter((item) => item.stockStatus === "in_stock").length, maxValue: Math.max(1, inventoryRows.length), color: "var(--chart-1)" },
        { label: "Low stock", value: inventoryRows.filter((item) => item.stockStatus === "low_stock").length, maxValue: Math.max(1, inventoryRows.length), color: "var(--chart-2)" },
        { label: "Out of stock", value: inventoryRows.filter((item) => item.stockStatus === "out_of_stock").length, maxValue: Math.max(1, inventoryRows.length), color: "var(--chart-4)" },
      ],
    },
    lists: [
      {
        title: "Request queue",
        description: "Requests that need a branch response.",
        rows: requestRows.map(({ createdAt: _createdAt, ...row }) => row),
        empty: "No patient requests are waiting right now.",
      },
      {
        title: "Inventory watch",
        description: "Items close to reorder or expiry limits.",
        rows: watchRows.map((item) => ({
          label: [item.medicineName, item.medicineStrength].filter(Boolean).join(" "),
          detail: item.expiresAt && item.expiresAt <= expiringSoon ? `Expires ${item.expiresAt.toLocaleDateString("en")}` : `${item.quantity} units remaining`,
          badge: item.stockStatus === "out_of_stock" ? "Out" : item.stockStatus === "low_stock" ? "Low" : "Expiry",
        })),
        empty: "No low-stock or expiring inventory needs attention.",
      },
    ],
  }
}

function emptyPharmacistDashboard(name: string): DashboardSummary {
  return {
    role: "pharmacist",
    hero: {
      badge: "Pharmacy dashboard",
      title: `Inventory desk, ${name}`,
      description: "Connect your account to a registered pharmacy branch before managing inventory or patient requests.",
      primaryHref: "/dashboard/pharmacy/setup",
      primaryLabel: "Set up branch",
      primaryIcon: "shield",
      secondaryHref: "/dashboard/pharmacy/inventory",
      secondaryLabel: "View inventory",
      secondaryIcon: "activity",
    },
    kpis: [
      { label: "Total SKUs", value: "0", detail: "No branch inventory linked", icon: "activity" },
      { label: "Low stock", value: "0", detail: "No reorder review needed", icon: "package" },
      { label: "Pending", value: "0", detail: "No requests waiting on response", icon: "bell" },
      { label: "Filled today", value: "0", detail: "No completed responses today", icon: "clipboard" },
    ],
    chart: {
      title: "Request flow",
      description: "Submitted versus completed patient requests.",
      kind: "bar",
      firstKey: "submitted",
      secondKey: "completed",
      firstLabel: "Submitted",
      secondLabel: "Completed",
      firstColor: "var(--chart-1)",
      secondColor: "var(--chart-2)",
      data: stripSeriesKeys(weekSkeleton("submitted", "completed")),
    },
    ring: {
      title: "Stock health",
      description: "Current inventory readiness by stock status.",
      data: [
        { label: "In stock", value: 0, maxValue: 1, color: "var(--chart-1)" },
        { label: "Low stock", value: 0, maxValue: 1, color: "var(--chart-2)" },
        { label: "Out of stock", value: 0, maxValue: 1, color: "var(--chart-4)" },
      ],
    },
    lists: [
      { title: "Request queue", description: "Requests that need a branch response.", rows: [], empty: "No patient requests are waiting right now." },
      { title: "Inventory watch", description: "Items close to reorder or expiry limits.", rows: [], empty: "No low-stock or expiring inventory needs attention." },
    ],
  }
}

async function getOperationsDashboard(profile: CurrentProfile): Promise<DashboardSummary> {
  const [pharmacyRows, profileRows, prescriptionRows, availabilityRows] = await Promise.all([
    db.select().from(pharmacies).orderBy(desc(pharmacies.createdAt)),
    db.select().from(profiles).orderBy(desc(profiles.createdAt)),
    db.select().from(prescriptions).orderBy(desc(prescriptions.createdAt)),
    db.select().from(availabilityRequests).orderBy(desc(availabilityRequests.createdAt)),
  ])

  const activeAccounts = profileRows.filter((item) => item.isActive).length
  const verifiedPharmacies = pharmacyRows.filter((item) => item.isVerified).length
  const awaitingReview = pharmacyRows.filter((item) => !item.isVerified)
  const totalRequests = prescriptionRows.length + availabilityRows.length
  const confirmedRequests =
    prescriptionRows.filter((item) => item.status === "verified").length +
    availabilityRows.filter((item) => item.status === "approved").length
  const fillRate = totalRequests ? Math.round((confirmedRequests / totalRequests) * 100) : 0
  const series = weekSkeleton("requests", "pharmacies")

  for (const item of prescriptionRows) addToSeries(series, item.createdAt, "requests")
  for (const item of availabilityRows) addToSeries(series, item.createdAt, "requests")
  for (const item of pharmacyRows) addToSeries(series, item.createdAt, "pharmacies")

  return {
    role: "admin",
    hero: {
      badge: "Operations dashboard",
      title: `Operations review, ${profile.fullName}`,
      description: "Monitor pharmacy participation, request flow, and trust signals across the medicine access network.",
      primaryHref: "/dashboard/pharmacy/verification",
      primaryLabel: "Verify pharmacies",
      primaryIcon: "shield",
      secondaryHref: "/dashboard",
      secondaryLabel: "Review network",
      secondaryIcon: "users",
    },
    kpis: [
      { label: "Pharmacies", value: compactNumber(pharmacyRows.length), detail: `${verifiedPharmacies} verified branches`, icon: "shield" },
      { label: "Awaiting review", value: compactNumber(awaitingReview.length), detail: "Pharmacy profiles needing approval", icon: "users" },
      { label: "Active accounts", value: compactNumber(activeAccounts), detail: "Patients, pharmacists, and operators", icon: "activity" },
      { label: "Network fill rate", value: `${fillRate}%`, detail: "Requests with confirmed stock or prescription approval", icon: "trend" },
    ],
    chart: {
      title: "Network flow",
      description: "Patient requests and pharmacy signups across the last 7 days.",
      kind: "area",
      firstKey: "requests",
      secondKey: "pharmacies",
      firstLabel: "Requests",
      secondLabel: "Pharmacies",
      firstColor: "var(--chart-1)",
      secondColor: "var(--chart-3)",
      data: stripSeriesKeys(series),
    },
    ring: {
      title: "Network readiness",
      description: "Coverage signals for the operating network.",
      data: [
        { label: "Verified", value: verifiedPharmacies, maxValue: Math.max(1, pharmacyRows.length), color: "var(--chart-1)" },
        { label: "Delivery ready", value: pharmacyRows.filter((item) => item.supportsDelivery).length, maxValue: Math.max(1, pharmacyRows.length), color: "var(--chart-2)" },
        { label: "Active accounts", value: activeAccounts, maxValue: Math.max(1, profileRows.length), color: "var(--chart-3)" },
      ],
    },
    lists: [
      {
        title: "Verification queue",
        description: "Branches that need final review.",
        rows: awaitingReview.slice(0, 3).map((item) => ({
          label: item.branchName ? `${item.name} ${item.branchName}` : item.name,
          detail: `${item.neighborhood} - ${item.licenseNumber}`,
          badge: "Review",
        })),
        empty: "No pharmacy profiles are waiting for review.",
      },
      {
        title: "Network watch",
        description: "Signals that may need follow-up.",
        rows: [
          {
            label: "Open patient requests",
            detail: `${availabilityRows.filter((item) => openAvailabilityStatuses.has(item.status)).length} availability checks still need a response`,
            badge: "Requests",
          },
          {
            label: "Prescription reviews",
            detail: `${prescriptionRows.filter((item) => openPrescriptionStatuses.has(item.status)).length} prescriptions are waiting on pharmacies`,
            badge: "Review",
          },
          {
            label: "Inactive accounts",
            detail: `${profileRows.length - activeAccounts} accounts are currently disabled`,
            badge: "Access",
          },
        ],
        empty: "No network signals need attention.",
      },
    ],
  }
}
