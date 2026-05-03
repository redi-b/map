import { BotIcon, SendIcon, ShieldCheckIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function AssistantPage() {
  return (
    <main className="grid min-h-[calc(100vh-4rem)] gap-6 p-4 md:grid-cols-[0.28fr_0.72fr] md:p-6">
      <aside className="rounded-lg border bg-card p-4">
        <h2 className="font-semibold">Chat history</h2>
        <div className="mt-4 flex flex-col gap-2 text-sm">
          <Button variant="secondary" className="justify-start">Metformin side effects</Button>
          <Button variant="ghost" className="justify-start">Aspirin dosage</Button>
          <Button variant="ghost" className="justify-start">Insulin storage</Button>
        </div>
      </aside>
      <section className="flex flex-col gap-4">
        <div className="rounded-lg border bg-secondary p-3 text-sm">
          This assistant provides medication information only and is not a substitute for professional medical advice.
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BotIcon className="size-5" /> MAP Assistant</CardTitle>
            <CardDescription>Ask about medicines, side effects, storage, and nearby verified pharmacies.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-lg bg-muted p-4">
              Metformin can cause nausea, diarrhea, and metallic taste, especially when starting. Taking it with meals can help.
              <div className="mt-3"><Badge variant="secondary"><ShieldCheckIcon className="size-3" /> Verified medical info</Badge></div>
            </div>
            <div className="flex gap-2">
              <Input placeholder="Type your question about medication..." />
              <Button><SendIcon data-icon="inline-start" />Send</Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
