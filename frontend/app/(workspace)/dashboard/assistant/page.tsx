"use client"

import { BotIcon, Loader2Icon, PlusIcon, SendIcon, ShieldAlertIcon, Trash2Icon } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  createAssistantSession,
  deleteAssistantSession,
  listAssistantSessions,
  sendAssistantMessage,
  type AssistantSession,
} from "@/lib/api"

const disclaimer =
  "This assistant provides medication information only and is not a substitute for professional medical advice. Always consult a healthcare professional for diagnosis and treatment."

const quickPrompts = [
  "What side effects should I watch for?",
  "How should I store my medicine?",
  "Can two medicines interact?",
  "How do I find stock near me?",
]

export default function AssistantPage() {
  const [sessions, setSessions] = useState<AssistantSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState("")
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [thinking, setThinking] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState("")
  const [error, setError] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? sessions[0] ?? null,
    [activeSessionId, sessions],
  )

  function scrollToBottom() {
    window.setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      listAssistantSessions()
        .then((data) => {
          setSessions(data.sessions)
          setActiveSessionId(data.sessions[0]?.id ?? "")
        })
        .catch(() => setError("Unable to load saved conversations."))
        .finally(() => setLoading(false))
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [activeSession?.messages.length])

  async function createNewSession() {
    if (creating) return

    setError("")
    setCreating(true)

    try {
      const session = await createAssistantSession()
      setSessions((current) => [session, ...current])
      setActiveSessionId(session.id)
    } catch {
      setError("Unable to start a new conversation.")
    } finally {
      setCreating(false)
    }
  }

  async function removeSession(sessionId: string) {
    if (sessions.length <= 1 || deletingId) return
    setError("")
    setDeletingId(sessionId)

    try {
      await deleteAssistantSession(sessionId)
      setSessions((current) => {
        const next = current.filter((session) => session.id !== sessionId)
        if (activeSessionId === sessionId) {
          setActiveSessionId(next[0]?.id ?? "")
        }
        return next
      })
    } catch {
      setError("Unable to delete that conversation.")
    } finally {
      setDeletingId("")
    }
  }

  async function sendMessage(content: string) {
    if (!activeSession || !content.trim() || thinking) return

    const trimmed = content.trim()
    setInput("")
    setThinking(true)
    setError("")

    try {
      const updatedSession = await sendAssistantMessage(activeSession.id, trimmed)
      setSessions((current) =>
        current.map((session) => (session.id === updatedSession.id ? updatedSession : session)),
      )
    } catch {
      setInput(trimmed)
      setError("Unable to send your message.")
    } finally {
      setThinking(false)
    }
  }

  async function handleSend(event: React.FormEvent) {
    event.preventDefault()
    await sendMessage(input)
  }

  return (
    <main className="grid min-h-[calc(100vh-4rem)] gap-6 p-4 md:grid-cols-[16rem_1fr] md:p-6">
      <aside className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Conversations</h2>
          <Button variant="ghost" size="icon" onClick={createNewSession} disabled={creating} aria-label="New conversation">
            {creating ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon />}
          </Button>
        </div>

        <div className="flex flex-1 flex-col gap-2">
          {loading ? (
            <div className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading
            </div>
          ) : sessions.length ? (
            sessions.map((session) => {
              const deleting = deletingId === session.id

              return (
              <div key={session.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveSessionId(session.id)}
                  disabled={deleting}
                  className={`flex-1 rounded-md px-3 py-2 text-left text-sm transition ${
                    session.id === activeSession?.id ? "bg-secondary font-medium" : "hover:bg-secondary/70"
                  }`}
                >
                  <span className="line-clamp-1">{session.title}</span>
                </button>
                {sessions.length > 1 ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 opacity-0 group-hover:opacity-100"
                    disabled={Boolean(deletingId)}
                    onClick={() => removeSession(session.id)}
                    aria-label="Delete conversation"
                  >
                    {deleting ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
                  </Button>
                ) : null}
              </div>
              )
            })
          ) : (
            <p className="rounded-md px-3 py-2 text-sm text-muted-foreground">No conversations yet.</p>
          )}
        </div>

        <div className="border-t pt-3 text-xs text-muted-foreground">
          Informational guidance only. Urgent or diagnostic questions need a clinician.
        </div>
      </aside>

      <section className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          <ShieldAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>{disclaimer}</p>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card className="flex flex-1 flex-col">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <BotIcon className="size-5" />
              MAP Medication Guide
            </CardTitle>
            <CardDescription>Ask about medicines, side effects, storage, and nearby verified pharmacies.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <div className="flex flex-1 flex-col gap-3">
              {activeSession?.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 text-sm ${
                      message.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.sender === "assistant" ? (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-[10px]">
                          Verified medication info
                        </Badge>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              {thinking ? (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                    <Loader2Icon className="size-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>

            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => sendMessage(prompt)}
                  disabled={!activeSession || thinking}
                >
                  {prompt}
                </Button>
              ))}
            </div>

            <form className="flex gap-2" onSubmit={handleSend}>
              <Input
                placeholder="Ask about a medication..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={thinking || !activeSession}
                aria-label="Medication question"
              />
              <Button type="submit" disabled={!input.trim() || thinking || !activeSession}>
                {thinking ? (
                  <Loader2Icon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <SendIcon data-icon="inline-start" />
                )}
                Send
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
