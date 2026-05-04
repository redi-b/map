"use client"

import { Loader2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"

export function RegisterForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")

    const result = await authClient.signUp.email({ name, email, password })
    setLoading(false)

    if (result.error) {
      setError(result.error.message ?? "Unable to create account")
      return
    }

    router.replace("/onboarding")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Save medicine searches, prescription requests, and pharmacy updates.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Full name
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Email
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Password
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : null}
            Create account
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
