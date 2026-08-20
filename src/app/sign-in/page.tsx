import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { SignInForm } from "@/components/auth/SignInForm"

export const metadata = { title: "Sign in · Engage" }

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  // Already signed in → send to the workspace (which itself routes to onboarding
  // if needed).
  const session = await auth()
  if (session?.user) redirect("/dashboard")

  const { error } = await searchParams

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f6f9] px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] text-base font-black text-[#0f2044]">
            E
          </span>
          <span className="text-xl font-bold tracking-tight text-[#1a1a2e]">Engage</span>
        </Link>

        <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-[#1a1a2e]">Sign in or create your account</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a 6-digit code. No password needed.
          </p>

          <SignInForm initialError={!!error} />

          <p className="mt-6 text-center text-xs text-muted-foreground">
            The free Starter plan includes Communications — no card required.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to our terms and privacy policy.
        </p>
      </div>
    </div>
  )
}
