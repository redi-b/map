import Link from "next/link"
import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-5">
      <div className="w-full max-w-md">
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          New to MAP? <Link className="font-medium text-foreground underline" href="/register">Create an account</Link>
        </p>
      </div>
    </main>
  )
}
