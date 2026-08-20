"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { sendLoginCode } from "@/app/actions/auth"

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-[#1a1a2e] outline-none transition-colors focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"

export function SignInForm({ initialError }: { initialError?: boolean }) {
  const router = useRouter()
  const [step, setStep] = useState<"email" | "code">("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(
    initialError ? "Something went wrong. Please try again." : null,
  )

  // Resend cooldown
  const [cooldown, setCooldown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  function startCooldown() {
    setCooldown(45)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCooldown((n) => {
        if (n <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return n - 1
      })
    }, 1000)
  }

  async function requestCode() {
    setError(null)
    setBusy(true)
    try {
      const res = await sendLoginCode(email)
      if (!res.ok) {
        setError(res.error)
        return false
      }
      setStep("code")
      setCode("")
      startCooldown()
      return true
    } finally {
      setBusy(false)
    }
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    await requestCode()
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await signIn("otp", { email, code, redirect: false })
      if (!res || res.error || !res.ok) {
        setError("Incorrect or expired code. Try again, or resend a new one.")
        setCode("")
        return
      }
      // Full navigation so the workspace gate decides workspace vs onboarding.
      window.location.href = "/dashboard"
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  // ── STEP: CODE ────────────────────────────────────────────────────
  if (step === "code") {
    return (
      <form onSubmit={handleVerify} className="mt-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to <strong className="text-[#1a1a2e]">{email}</strong>. Enter it
          below — it expires in 10 minutes.
        </p>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
            Sign-in code
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className={`${inputCls} text-center text-2xl font-mono tracking-[0.5em]`}
          />
        </div>

        <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
          {busy ? "Verifying…" : "Verify & sign in"}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => { setStep("email"); setCode(""); setError(null) }}
            className="text-muted-foreground hover:text-[#1a1a2e]"
          >
            ← Use a different email
          </button>
          <button
            type="button"
            onClick={() => { if (cooldown === 0) requestCode() }}
            disabled={busy || cooldown > 0}
            className="font-medium text-[#1b3a6b] hover:underline disabled:text-muted-foreground disabled:no-underline"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
        </div>
      </form>
    )
  }

  // ── STEP: EMAIL ───────────────────────────────────────────────────
  return (
    <form onSubmit={handleSendCode} className="mt-6 space-y-4">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@campaign.org"
          className={inputCls}
        />
      </div>

      <Button type="submit" className="w-full" disabled={busy || !email.trim()}>
        {busy ? "Sending code…" : "Send sign-in code"}
      </Button>
    </form>
  )
}
