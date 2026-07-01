"use client"

import { useEffect } from "react"

/**
 * The magic link opens in whatever window/tab handles it, completing sign-in
 * there and leaving this "check your email" tab stranded. While the cookie jar
 * is shared (same browser), poll the session endpoint and advance this tab too
 * once the user is authenticated — so they aren't left looking at two windows.
 */
export function VerifyPoller() {
  useEffect(() => {
    let cancelled = false
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" })
        const data = await res.json()
        if (!cancelled && data?.user) {
          // Full navigation so the workspace gate decides workspace vs onboarding.
          window.location.href = "/"
        }
      } catch {
        // transient — keep polling
      }
    }, 2500)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return null
}
