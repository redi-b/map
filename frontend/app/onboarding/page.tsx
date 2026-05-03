import { OnboardingForm } from "@/components/auth/onboarding-form"

export default function OnboardingPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-5">
      <div className="w-full max-w-4xl">
        <OnboardingForm />
      </div>
    </main>
  )
}
