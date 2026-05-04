import Link from "next/link"
import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"
import { PublicNav } from "@/components/map/public-nav"

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background">
      <PublicNav />
      <div className="grid min-h-[calc(100vh-5rem)] gap-5 p-5 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="hidden flex-col justify-between rounded-lg border bg-secondary p-8 lg:flex">
          <div>
            <p className="text-sm font-semibold uppercase text-muted-foreground">MAP access</p>
            <h1 className="mt-4 max-w-xl font-[var(--font-display)] text-5xl font-semibold">
              One account for patients, pharmacies, and administrators.
            </h1>
          </div>
          <div className="grid gap-3">
            {["Verified stock search", "Prescription request tracking", "Role-aware dashboards"].map((item) => (
              <div key={item} className="rounded-lg bg-background p-4 font-medium">{item}</div>
            ))}
          </div>
        </section>
        <div className="grid place-items-center">
          <div className="w-full max-w-md">
            <Suspense>
              <LoginForm />
            </Suspense>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              New to MAP? <Link className="font-medium text-foreground underline" href="/register">Create an account</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
