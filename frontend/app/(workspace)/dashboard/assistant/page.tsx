"use client"

import { BotIcon, SendIcon, ShieldAlertIcon, Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react"
import { useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Message = {
  id: string
  sender: "user" | "assistant"
  content: string
  timestamp: Date
}

type ChatSession = {
  id: string
  title: string
  messages: Message[]
}

const disclaimer = "This assistant provides medication information only and is not a substitute for professional medical advice. Always consult a healthcare professional for diagnosis and treatment."

/** Simple pattern-matched responses for common medication questions. */
function getAssistantResponse(question: string): string {
  const q = question.toLowerCase()

  if (q.includes("metformin")) {
    return "Metformin (Glucophage) is used to manage type 2 diabetes. Common side effects include nausea, diarrhea, and stomach discomfort — typically improving after the first few weeks. Take it with meals. Store at room temperature. Do not crush extended-release tablets."
  }
  if (q.includes("amoxicillin")) {
    return "Amoxicillin is a penicillin-type antibiotic used for bacterial infections. Take the full course as prescribed. Common side effects include diarrhea, nausea, and rash. Store in a cool, dry place. If allergic to penicillin, inform your doctor immediately."
  }
  if (q.includes("paracetamol") || q.includes("acetaminophen")) {
    return "Paracetamol (Acetaminophen) relieves pain and reduces fever. Standard adult dose is 500mg–1000mg every 4–6 hours, not exceeding 4g per day. Avoid alcohol while using this medication. Overdose can cause severe liver damage."
  }
  if (q.includes("insulin")) {
    return "Insulin is essential for managing diabetes. Store unopened vials in a refrigerator (2°C–8°C). Once opened, most can be kept at room temperature for 28 days. Never freeze insulin. Rotate injection sites to prevent lipodystrophy."
  }
  if (q.includes("aspirin")) {
    return "Aspirin (Acetylsalicylic acid) is used for pain relief, fever reduction, and heart attack prevention at low doses. Take with food to reduce stomach irritation. Not recommended for children under 16 due to Reye's syndrome risk."
  }
  if (q.includes("omeprazole")) {
    return "Omeprazole is a proton pump inhibitor that reduces stomach acid. Take 20mg–40mg once daily before meals, typically for 4–8 weeks. Not for long-term use without medical supervision. May reduce absorption of calcium and vitamin B12."
  }
  if (q.includes("atorvastatin") || q.includes("statin")) {
    return "Atorvastatin (Lipitor) lowers cholesterol and reduces heart disease risk. Take once daily, usually in the evening. Avoid grapefruit. Report unexplained muscle pain to your doctor. Regular liver function tests may be needed."
  }
  if (q.includes("lisinopril") || q.includes("ace inhibitor")) {
    return "Lisinopril is an ACE inhibitor used for high blood pressure and heart failure. Common side effects include dry cough and dizziness. Rise slowly from sitting positions. Avoid potassium supplements unless directed by your doctor."
  }
  if (q.includes("side effect")) {
    return "Side effects vary by medication. Please specify which medication you're asking about and I can provide more detailed information. Common categories include: gastrointestinal effects, drowsiness, dizziness, and allergic reactions."
  }
  if (q.includes("storage") || q.includes("store")) {
    return "Most medications should be stored at room temperature (15°C–25°C) in a dry place away from direct sunlight. Some medications like insulin and certain antibiotics require refrigeration. Always check the label for specific storage instructions."
  }
  if (q.includes("interaction") || q.includes("mix")) {
    return "Drug interactions can be dangerous. Always inform your doctor and pharmacist about all medications you take, including over-the-counter drugs and supplements. Use the 'Find medicine' feature to check availability of prescribed alternatives."
  }

  return "I can help with medication information including dosage guidelines, side effects, storage instructions, and drug interactions. Please ask about a specific medication (e.g., 'Tell me about Metformin' or 'Amoxicillin side effects') and I'll provide verified information."
}

const initialSession: ChatSession = {
  id: "default",
  title: "New conversation",
  messages: [
    {
      id: "welcome",
      sender: "assistant",
      content: "Hello! I'm the MAP Medication Guide. I can help with information about medicines including dosage, side effects, storage, and interactions. What would you like to know?",
      timestamp: new Date(),
    },
  ],
}

export default function AssistantPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([initialSession])
  const [activeSessionId, setActiveSessionId] = useState("default")
  const [input, setInput] = useState("")
  const [thinking, setThinking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? sessions[0]

  function scrollToBottom() {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || thinking) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    // Update session title if it's the first user message
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              title: s.messages.filter((m) => m.sender === "user").length === 0 ? input.trim().substring(0, 30) : s.title,
              messages: [...s.messages, userMsg],
            }
          : s
      )
    )
    setInput("")
    scrollToBottom()

    // Simulate "thinking"
    setThinking(true)
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700))

    const assistantMsg: Message = {
      id: `assistant-${Date.now()}`,
      sender: "assistant",
      content: getAssistantResponse(userMsg.content),
      timestamp: new Date(),
    }

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId ? { ...s, messages: [...s.messages, assistantMsg] } : s
      )
    )
    setThinking(false)
    scrollToBottom()
  }

  function createNewSession() {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: "New conversation",
      messages: [
        {
          id: `welcome-${Date.now()}`,
          sender: "assistant",
          content: "Hello! What medication information can I help you with?",
          timestamp: new Date(),
        },
      ],
    }
    setSessions((prev) => [...prev, newSession])
    setActiveSessionId(newSession.id)
  }

  function deleteSession(sessionId: string) {
    if (sessions.length <= 1) return
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    if (activeSessionId === sessionId) {
      setActiveSessionId(sessions.find((s) => s.id !== sessionId)?.id ?? sessions[0].id)
    }
  }

  return (
    <main className="grid min-h-[calc(100vh-4rem)] gap-6 p-4 md:grid-cols-[16rem_1fr] md:p-6">
      {/* Sidebar */}
      <aside className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Conversations</h2>
          <Button variant="ghost" size="icon" onClick={createNewSession}>
            <PlusIcon />
          </Button>
        </div>
        <div className="flex flex-col gap-1">
          {sessions.map((session) => (
            <div key={session.id} className="group flex items-center gap-1">
              <Button
                variant={session.id === activeSessionId ? "secondary" : "ghost"}
                className="flex-1 justify-start truncate"
                size="sm"
                onClick={() => setActiveSessionId(session.id)}
              >
                {session.title}
              </Button>
              {sessions.length > 1 ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 opacity-0 transition group-hover:opacity-100"
                  onClick={() => deleteSession(session.id)}
                >
                  <Trash2Icon className="size-3" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </aside>

      {/* Chat area */}
      <section className="flex flex-col gap-4">
        {/* Disclaimer */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          <ShieldAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>{disclaimer}</p>
        </div>

        {/* Messages */}
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
              {activeSession.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 text-sm ${
                      msg.sender === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.sender === "assistant" ? (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-[10px]">Verified medical info</Badge>
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

            {/* Input */}
            <form className="flex gap-2" onSubmit={handleSend}>
              <Input
                placeholder="Ask about a medication..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={thinking}
              />
              <Button type="submit" disabled={!input.trim() || thinking}>
                <SendIcon data-icon="inline-start" />
                Send
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
