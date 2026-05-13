"use client"

import { BellIcon, CheckCheckIcon, CheckIcon, ClockIcon, Loader2Icon, PillIcon, SendIcon, ClipboardCheckIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

type Notification = {
  id: string
  message: string
  source: "prescription" | "availability_request" | "reminder" | "system" | string
  sourceEntityId: string | null
  isRead: boolean
  dateSent: string
}

const sourceLabels: Record<string, string> = {
  prescription: "Prescription",
  availability_request: "Request",
  reminder: "Reminder",
  system: "System",
}

function notificationTarget(item: Notification) {
  if (item.source === "prescription" || item.source === "availability_request") return "/dashboard/prescriptions"
  if (item.source === "reminder") return "/dashboard/adherence"
  return "/dashboard"
}

function SourceIcon({ source }: { source: string }) {
  if (source === "prescription") return <ClipboardCheckIcon className="size-4" />
  if (source === "availability_request") return <SendIcon className="size-4" />
  if (source === "reminder") return <PillIcon className="size-4" />
  return <BellIcon className="size-4" />
}

function formatTime(value: string) {
  const date = new Date(value)
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date)
}

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [markingId, setMarkingId] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/notifications/count`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setUnreadCount(data.unread)
      }
    } catch {
      // silently fail — not critical
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${apiBaseUrl}/api/notifications`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setItems(data.items)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchCount()
    }, 0)
    const interval = window.setInterval(() => {
      void fetchCount()
    }, 30_000)
    return () => {
      window.clearTimeout(timeout)
      window.clearInterval(interval)
    }
  }, [fetchCount])

  function handleToggle() {
    const next = !open
    setOpen(next)
    if (next) void fetchNotifications()
  }

  async function markAllRead() {
    try {
      await fetch(`${apiBaseUrl}/api/notifications/read-all`, {
        method: "POST",
        credentials: "include",
      })
      setUnreadCount(0)
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch {
      // silently fail
    }
  }

  async function markOneRead(id: string) {
    setMarkingId(id)
    try {
      await fetch(`${apiBaseUrl}/api/notifications/${id}/read`, {
        method: "PATCH",
        credentials: "include",
      })
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
      setUnreadCount((count) => {
        const item = items.find((notification) => notification.id === id)
        return item && !item.isRead ? Math.max(0, count - 1) : count
      })
    } catch {
      // silently fail
    } finally {
      setMarkingId("")
    }
  }

  function openNotification(item: Notification) {
    setOpen(false)
    router.push(notificationTarget(item))
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="relative flex size-9 items-center justify-center rounded-full border bg-background transition hover:bg-secondary"
        onClick={handleToggle}
        aria-label="Notifications"
      >
        <BellIcon className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[22rem] overflow-hidden rounded-xl border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b p-3">
            <div>
              <h3 className="font-semibold">Notifications</h3>
              <p className="text-xs text-muted-foreground">Open items or mark them read.</p>
            </div>
            {unreadCount > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => void markAllRead()}>
                <CheckCheckIcon data-icon="inline-start" />
                All read
              </Button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
                <BellIcon className="size-8" />
                No notifications yet.
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className={cn("group grid grid-cols-[1fr_auto] gap-2 border-b p-3 transition hover:bg-secondary/70", !item.isRead && "bg-primary/5")}>
                  <button type="button" className="min-w-0 text-left" onClick={() => openNotification(item)}>
                    <div className="flex items-start gap-3">
                      <div className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground", !item.isRead && "border-primary/40 bg-primary/10 text-primary")}>
                        <SourceIcon source={item.source} />
                      </div>
                      <div className="min-w-0">
                        <p className={cn("line-clamp-2 text-sm", !item.isRead ? "font-medium" : "text-muted-foreground")}>{item.message}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{sourceLabels[item.source] ?? item.source}</Badge>
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <ClockIcon className="size-3" />
                            {formatTime(item.dateSent)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                  <Button
                    type="button"
                    variant={item.isRead ? "ghost" : "outline"}
                    size="icon-sm"
                    className="self-start"
                    disabled={item.isRead || markingId === item.id}
                    onClick={() => void markOneRead(item.id)}
                    aria-label={item.isRead ? "Already read" : "Mark notification read"}
                  >
                    {markingId === item.id ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
