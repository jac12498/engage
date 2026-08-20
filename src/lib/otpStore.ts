import "server-only"

/**
 * In-memory store for email sign-in codes, with TTL + attempt limiting.
 *
 * Single-process only (fine for one Railway instance). If Engage ever scales to
 * multiple instances, back this with the DB or Redis — the send and the verify
 * must share the same store.
 */

import { createHash, randomInt } from "crypto"

interface OTPEntry {
  codeHash: string
  expiresAt: number
  attempts: number
}

// Pin the store to globalThis so a single Node process shares ONE Map across
// every server context that touches it. The server action that STORES the code
// and the NextAuth route handler that VERIFIES it are compiled into different
// server bundles (and route handlers compile lazily on first hit) — a plain
// module-level `const store = new Map()` would hand each its own empty Map, so
// verification never finds the code. Also survives dev HMR module reloads.
const globalForOtp = globalThis as typeof globalThis & {
  __engageOtpStore?: Map<string, OTPEntry>
}
const store: Map<string, OTPEntry> =
  globalForOtp.__engageOtpStore ?? (globalForOtp.__engageOtpStore = new Map())

const TTL_MS = 10 * 60 * 1000 // 10 minutes
const MAX_ATTEMPTS = 5

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex")
}

function evictExpired(): void {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.expiresAt < now) store.delete(key)
  }
}

export function generateCode(): string {
  return randomInt(100000, 1000000).toString()
}

export function storeCode(email: string, code: string): void {
  evictExpired()
  store.set(email.toLowerCase(), {
    codeHash: hashCode(code),
    expiresAt: Date.now() + TTL_MS,
    attempts: 0,
  })
}

/**
 * Verify a code for an email. Consumes an attempt; deletes the entry on success,
 * expiry, or once the attempt cap is hit. Returns true only on an exact match.
 */
export function verifyCode(email: string, code: string): boolean {
  const key = email.toLowerCase()
  const entry = store.get(key)
  if (!entry) return false

  if (Date.now() > entry.expiresAt || entry.attempts >= MAX_ATTEMPTS) {
    store.delete(key)
    return false
  }

  entry.attempts++

  if (hashCode(code) !== entry.codeHash) return false

  store.delete(key)
  return true
}
