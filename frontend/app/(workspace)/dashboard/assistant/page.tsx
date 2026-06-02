"use client"

import { BotIcon, Loader2Icon, PlusIcon, SendIcon, ShieldAlertIcon, Trash2Icon, UserIcon } from "lucide-react"
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
  "What are the side effects of metformin?",
  "What is amoxicillin used for?",
  "How should insulin be stored?",
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
  const tempMessageCounterRef = useRef(0)

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

    // Cache current messages for fallback/reversion in case of failure
    const originalMessages = activeSession.messages
    tempMessageCounterRef.current += 1
    const tempUserMessageId = `temp-user-${tempMessageCounterRef.current}`
    
    // Create optimistic user message
    const optimisticUserMessage = {
      id: tempUserMessageId,
      sender: "user" as const,
      content: trimmed,
      hasDisclaimer: false,
      timestamp: new Date().toISOString(),
    }

    // Instantly append user's message to the active session in local state
    setSessions((current) =>
      current.map((session) => {
        if (session.id === activeSession.id) {
          return {
            ...session,
            messages: [...session.messages, optimisticUserMessage],
          }
        }
        return session
      }),
    )

    try {
      const updatedSession = await sendAssistantMessage(activeSession.id, trimmed)
      setSessions((current) =>
        current.map((session) => (session.id === updatedSession.id ? updatedSession : session)),
      )
    } catch {
      // Revert optimistic update if API call fails
      setSessions((current) =>
        current.map((session) => {
          if (session.id === activeSession.id) {
            return {
              ...session,
              messages: originalMessages,
            }
          }
          return session
        }),
      )
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
    <main className="grid h-[calc(100vh-5.5rem)] gap-6 p-4 md:grid-cols-[16rem_1fr] md:p-6 overflow-hidden">
      <aside className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm h-full overflow-hidden">
        <div className="flex items-center justify-between pb-2 border-b shrink-0">
          <h2 className="font-semibold text-xs tracking-wider text-muted-foreground uppercase">Conversations</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-secondary transition-colors" onClick={createNewSession} disabled={creating} aria-label="New conversation">
            {creating ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
          </Button>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto pr-1 select-none">
          {loading ? (
            <div className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground">
              <Loader2Icon className="size-3.5 animate-spin" />
              Loading conversations...
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
                    className={`flex-1 rounded-md px-3 py-2 text-left text-xs transition-all duration-200 ${
                      session.id === activeSession?.id
                        ? "bg-primary/10 text-primary font-medium shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="line-clamp-1">{session.title}</span>
                  </button>
                  {sessions.length > 1 ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      disabled={Boolean(deletingId)}
                      onClick={() => removeSession(session.id)}
                      aria-label="Delete conversation"
                    >
                      {deleting ? <Loader2Icon className="size-3.5 animate-spin" /> : <Trash2Icon className="size-3.5" />}
                    </Button>
                  ) : null}
                </div>
              );
            })
          ) : (
            <p className="rounded-md px-3 py-2 text-xs text-muted-foreground">No conversations yet.</p>
          )}
        </div>

        <div className="border-t pt-3 text-[10px] leading-relaxed text-muted-foreground shrink-0">
          Sources: Ethiopia EML catalog and openFDA drug labels. The model only summarizes retrieved source text.
        </div>
      </aside>

      <section className="flex flex-col gap-4 h-full overflow-hidden">
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs shrink-0 shadow-sm">
          <ShieldAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>{disclaimer}</p>
        </div>

        {error ? <p className="text-xs text-destructive shrink-0 px-1">{error}</p> : null}

        <Card className="flex flex-1 flex-col overflow-hidden h-full border shadow-sm">
          <CardHeader className="border-b shrink-0 py-3.5 px-4 bg-muted/10">
            <CardTitle className="flex items-center gap-2 text-base">
              <BotIcon className="size-5 text-primary" />
              MAP Medication Guide
            </CardTitle>
            <CardDescription className="text-xs">
              Ask with a medicine name. Responses use the Ethiopia EML catalog and openFDA label sections; the model only summarizes retrieved source text.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex flex-1 flex-col overflow-hidden p-0 bg-background">
            {/* Scrollable messages container */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {activeSession?.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 w-full ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.sender !== "user" ? (
                    <div className="flex size-8 shrink-0 select-none items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-semibold shadow-sm">
                      <BotIcon className="size-4.5" />
                    </div>
                  ) : null}
                  
                  <div className="flex flex-col max-w-[75%]">
                    <div
                      className={`rounded-2xl p-3.5 text-sm shadow-sm transition-all duration-200 ${
                        message.sender === "user" 
                          ? "bg-primary text-primary-foreground rounded-tr-none" 
                          : "bg-muted text-foreground rounded-tl-none border border-muted/50"
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      {message.sender === "assistant" ? (
                        <div className="mt-2.5 flex items-center gap-1.5">
                          <Badge variant="outline" className="bg-background/50 text-[10px] font-semibold border-primary/20 text-primary px-1.5 py-0">
                            Source-backed answer
                          </Badge>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {message.sender === "user" ? (
                    <div className="flex size-8 shrink-0 select-none items-center justify-center rounded-full border border-primary/20 bg-background text-primary text-xs font-semibold shadow-sm">
                      <UserIcon className="size-4.5 text-primary/80" />
                    </div>
                  ) : null}
                </div>
              ))}

              {thinking ? (
                <div className="flex items-start gap-3 justify-start animate-fade-in">
                  <div className="flex size-8 shrink-0 select-none items-center justify-center rounded-full border bg-primary/10 text-primary border-primary/20">
                    <BotIcon className="size-4.5" />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-none bg-muted px-4 py-3 text-sm text-muted-foreground border border-muted/50 shadow-sm">
                    <div className="flex gap-1.5 items-center py-1">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms", animationDuration: "1s" }}></span>
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms", animationDuration: "1s" }}></span>
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms", animationDuration: "1s" }}></span>
                    </div>
                  </div>
                </div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>

            {/* Locked input toolbar */}
            <div className="shrink-0 p-4 border-t bg-card flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    disabled={!activeSession || thinking}
                    className="rounded-full border border-muted/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground bg-background transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:border-primary hover:text-primary hover:bg-primary/5 disabled:pointer-events-none disabled:opacity-50 shadow-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <form className="flex gap-2 relative items-center" onSubmit={handleSend}>
                <Input
                  placeholder="Ask about a named medicine..."
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  disabled={thinking || !activeSession}
                  className="flex-1 h-11 pl-4 pr-12 rounded-full border-muted bg-background focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 shadow-sm text-sm"
                  aria-label="Medication question"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  className="absolute right-1 size-9 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm" 
                  disabled={!input.trim() || thinking || !activeSession}
                >
                  {thinking ? (
                    <Loader2Icon className="animate-spin size-4" />
                  ) : (
                    <SendIcon className="size-4" />
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
