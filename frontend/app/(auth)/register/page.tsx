import Link from "next/link"
import { RegisterForm } from "@/components/auth/register-form"
import { PublicNav } from "@/components/map/public-nav"

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-background">
      <PublicNav />
      <div className="grid min-h-[calc(100vh-5rem)] gap-5 p-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between rounded-lg border bg-card p-8 lg:flex">
          <div>
            <p className="text-sm font-semibold uppercase text-muted-foreground">Start with your role</p>
            <h1 className="mt-4 max-w-xl font-[var(--font-display)] text-5xl font-semibold">
              MAP adapts after signup.
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Patients get medicine search and reminders. Pharmacists get inventory and request review. Admins get verification controls.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {["Patient", "Pharmacist", "Admin"].map((item) => (
              <div key={item} className="rounded-lg bg-secondary p-4 font-medium">{item}</div>
            ))}
          </div>
        </section>
        <div className="grid place-items-center">
          <div className="w-full max-w-md">
            <RegisterForm />
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already registered? <Link className="font-medium text-foreground underline" href="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
