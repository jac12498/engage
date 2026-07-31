import Link from "next/link"
import { redirect } from "next/navigation"
import { auth, signIn } from "@/lib/auth"
import { Button } from "@/components/ui/button"

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

  async function sendMagicLink(formData: FormData) {
    "use server"
    const email = String(formData.get("email") || "").trim().toLowerCase()
    if (!email) return
    await signIn("email", { email, redirectTo: "/dashboard" })
  }

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
            Enter your email and we&apos;ll send you a secure sign-in link. No password needed.
          </p>

          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Something went wrong sending your link. Please try again.
            </p>
          )}

          <form action={sendMagicLink} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@campaign.org"
                className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-[#1a1a2e] outline-none transition-colors focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"
              />
            </div>
            <Button type="submit" className="w-full">
              Send sign-in link
            </Button>
          </form>

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
