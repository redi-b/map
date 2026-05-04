import Link from "next/link"
import { RegisterForm } from "@/components/auth/register-form"
import { AuthNav } from "@/components/map/auth-nav"

const paths = [
  "Find medicine near home or work",
  "Track prescription requests",
  "Keep pharmacy stock and requests organized",
]

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,var(--background),var(--muted))] text-foreground">
      <AuthNav />
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl gap-8 px-5 pb-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="hidden min-h-[680px] flex-col justify-between overflow-hidden rounded-lg border bg-card p-8 shadow-sm lg:flex">
          <div>
            <p className="text-sm font-semibold uppercase text-muted-foreground">Get started</p>
            <h1 className="mt-4 max-w-2xl font-[var(--font-display)] text-5xl font-semibold leading-tight">
              One account for medicine access work.
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Choose your workspace after signup. Patients get care tools. Pharmacy teams get
              stock and request tools.
            </p>
          </div>
          <div className="rounded-lg border bg-background/70">
            {paths.map((item, index) => (
              <div key={item} className="flex items-center gap-4 border-b p-4 last:border-b-0">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <span className="font-medium">{item}</span>
              </div>
            ))}
          </div>
        </section>
        <div className="grid place-items-center">
          <div className="w-full max-w-md">
            <RegisterForm />
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already registered?{" "}
              <Link className="font-medium text-foreground underline" href="/login">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
