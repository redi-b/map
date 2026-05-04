import Link from "next/link"
import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"
import { AuthNav } from "@/components/map/auth-nav"

const careSignals = [
  { label: "Saved searches", value: "Medicine availability near you" },
  { label: "Prescriptions", value: "Request history and replies" },
  { label: "Reminders", value: "Refill and dose follow-up" },
]

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,var(--background),var(--muted))] text-foreground">
      <AuthNav />
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl gap-8 px-5 pb-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden min-h-[680px] flex-col justify-between overflow-hidden rounded-lg border bg-card p-8 shadow-sm lg:flex">
          <div>
            <p className="text-sm font-semibold uppercase text-muted-foreground">Welcome back</p>
            <h1 className="mt-4 max-w-2xl font-[var(--font-display)] text-5xl font-semibold leading-tight">
              Pick up from your last medicine request.
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              MAP keeps care tasks and pharmacy replies in one quiet workspace, so patients and
              pharmacy teams can move faster without losing context.
            </p>
          </div>
          <div className="rounded-lg border bg-background/70">
            {careSignals.map((item, index) => (
              <div
                key={item.label}
                className="grid grid-cols-[10rem_1fr] gap-4 border-b p-4 last:border-b-0"
              >
                <span className="text-sm font-medium text-muted-foreground">
                  {String(index + 1).padStart(2, "0")} / {item.label}
                </span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </section>
        <div className="grid place-items-center">
          <div className="w-full max-w-md">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              New to MAP?{" "}
              <Link className="font-medium text-foreground underline" href="/register">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
