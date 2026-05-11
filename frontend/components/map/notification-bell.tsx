"use client"

import { BellIcon, CheckCheckIcon, Loader2Icon } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

type Notification = {
  id: string
  message: string
  source: string
  isRead: boolean
  dateSent: string
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
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
    if (next) fetchNotifications()
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
    try {
      await fetch(`${apiBaseUrl}/api/notifications/${id}/read`, {
        method: "PATCH",
        credentials: "include",
      })
      setUnreadCount((c) => Math.max(0, c - 1))
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    } catch {
      // silently fail
    }
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
        <div className="absolute right-0 top-12 z-50 w-80 rounded-lg border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b p-3">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 ? (
              <Button variant="ghost" size="sm" onClick={markAllRead}>
                <CheckCheckIcon data-icon="inline-start" />
                Mark all read
              </Button>
            ) : null}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-6 text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`flex w-full flex-col gap-1 border-b p-3 text-left transition hover:bg-secondary ${!item.isRead ? "bg-primary/5" : ""}`}
                  onClick={() => !item.isRead && markOneRead(item.id)}
                >
                  <p className={`text-sm ${!item.isRead ? "font-medium" : "text-muted-foreground"}`}>
                    {item.message}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{item.source}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(item.dateSent).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
