import Link from "next/link"
import { RegisterForm } from "@/components/auth/register-form"

export default function RegisterPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-5">
      <div className="w-full max-w-md">
        <RegisterForm />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already registered? <Link className="font-medium text-foreground underline" href="/login">Sign in</Link>
        </p>
      </div>
    </main>
  )
}
