"use client"

import { useState } from "react"

const inputCls =
  "w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-black/30"

export function NewsletterSignupForm({
  committeeId,
  accent,
  buttonLabel,
}: {
  committeeId: string
  accent: string
  buttonLabel?: string
}) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus("submitting")
    try {
      const res = await fetch("/api/website/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ committeeId, email, name }),
      })
      setStatus(res.ok ? "done" : "error")
    } catch {
      setStatus("error")
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-black/10 bg-[#f7f8fa] p-6 text-center">
        <p className="text-lg font-semibold" style={{ color: accent }}>
          Almost there — check your email!
        </p>
        <p className="mt-1 text-sm text-[#555]">
          We sent a confirmation link. Click it to start receiving the newsletter.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-black/10 bg-white p-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          className={inputCls}
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email *"
          required
          className={inputCls}
        />
      </div>
      {status === "error" && <p className="text-sm text-red-600">Something went wrong. Please try again.</p>}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-full px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
        style={{ backgroundColor: accent }}
      >
        {status === "submitting" ? "Submitting…" : buttonLabel || "Subscribe"}
      </button>
    </form>
  )
}
