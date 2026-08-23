"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Users, Merge, X, Mail, Phone, MapPin, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { mergeContacts, dismissDuplicateGroup } from "@/app/contacts/duplicates/actions"
import { formatPhone } from "@/lib/contacts"
import type { DuplicateGroup, DupContact } from "@/lib/contactsDuplicates"

/** Default survivor: the most-complete record (most fields), tie-broken by oldest. */
function defaultSurvivor(contacts: DupContact[]): string {
  const score = (c: DupContact) => c.emails.length + c.phones.length + (c.address ? 1 : 0) + c.noteCount + c.donationCount
  return [...contacts].sort((a, b) => score(b) - score(a) || a.createdAt.localeCompare(b.createdAt))[0].id
}

export function DuplicatesReview({ groups, canMerge }: { groups: DuplicateGroup[]; canMerge: boolean }) {
  const router = useRouter()
  const [keep, setKeep] = useState<Record<string, string>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function survivorFor(g: DuplicateGroup) {
    return keep[g.key] ?? defaultSurvivor(g.contacts)
  }

  function doMerge(g: DuplicateGroup) {
    const survivorId = survivorFor(g)
    const losers = g.contacts.map((c) => c.id).filter((id) => id !== survivorId)
    setError(null)
    setBusyKey(g.key)
    startTransition(async () => {
      const r = await mergeContacts(survivorId, losers)
      setBusyKey(null)
      if (!r.ok) return setError(r.error)
      router.refresh()
    })
  }

  function doDismiss(g: DuplicateGroup) {
    setError(null)
    setBusyKey(g.key)
    startTransition(async () => {
      const r = await dismissDuplicateGroup(g.contacts.map((c) => c.id))
      setBusyKey(null)
      if (!r.ok) return setError(r.error)
      router.refresh()
    })
  }

  return (
    <div>
      <Link
        href="/contacts"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-[#1a1a2e]"
      >
        <ArrowLeft className="h-4 w-4" />
        Contacts
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-[#1a1a2e]">Review duplicates</h1>
      <p className="mt-1 max-w-2xl text-muted-foreground">
        These contacts look like the same person. Pick the record to keep and merge — everything (emails, phones,
        addresses, notes, donations, tags) moves onto it — or mark a group as not a duplicate.
      </p>

      {error && (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      {groups.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border bg-white/60 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1e6b3a]/10 text-[#1e6b3a]">
            <Check className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-[#1a1a2e]">No duplicates found</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Your contact list looks clean.</p>
          <Link
            href="/contacts"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[#1b3a6b] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#16305a]"
          >
            <Users className="h-4 w-4" />
            Back to contacts
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {groups.map((g) => {
            const survivorId = survivorFor(g)
            const busy = busyKey === g.key
            return (
              <div key={g.key} className="rounded-2xl border border-border bg-white">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <span className="text-sm font-semibold text-[#1a1a2e]">
                    Likely the same person · {g.contacts.length} records
                  </span>
                  {canMerge && <span className="text-xs text-muted-foreground">Keep the selected record</span>}
                </div>

                <div className="divide-y divide-border/60">
                  {g.contacts.map((c) => (
                    <label
                      key={c.id}
                      className={`flex cursor-pointer items-start gap-3 px-5 py-3 transition-colors ${
                        c.id === survivorId ? "bg-[#1b3a6b]/5" : "hover:bg-muted/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`keep-${g.key}`}
                        checked={c.id === survivorId}
                        onChange={() => setKeep((prev) => ({ ...prev, [g.key]: c.id }))}
                        className="mt-1 accent-[#1b3a6b]"
                        disabled={busy}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/contacts/${c.id}`}
                            className="font-medium text-[#1b3a6b] underline underline-offset-2 decoration-[#1b3a6b]/40 hover:decoration-[#1b3a6b]"
                          >
                            {[c.lastName, c.firstName].filter(Boolean).join(", ") || "—"}
                          </Link>
                          {c.id === survivorId && (
                            <span className="rounded-full bg-[#1b3a6b] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                              Keep
                            </span>
                          )}
                          {c.tags.map((t) => (
                            <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              {t}
                            </span>
                          ))}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                          {c.emails.map((e) => (
                            <span key={e} className="inline-flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {e}
                            </span>
                          ))}
                          {c.phones.map((p) => (
                            <span key={p} className="inline-flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {formatPhone(p)}
                            </span>
                          ))}
                          {c.address && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {c.address}
                            </span>
                          )}
                        </div>
                        {(c.noteCount > 0 || c.donationCount > 0) && (
                          <div className="mt-0.5 text-xs text-muted-foreground/70">
                            {[
                              c.noteCount > 0 ? `${c.noteCount} note${c.noteCount === 1 ? "" : "s"}` : null,
                              c.donationCount > 0 ? `${c.donationCount} donation${c.donationCount === 1 ? "" : "s"}` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
                  <button
                    onClick={() => doDismiss(g)}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-[#1a1a2e] transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    Not duplicates
                  </button>
                  {canMerge && (
                    <Button onClick={() => doMerge(g)} disabled={busy}>
                      {busy ? (
                        <>
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                          Merging…
                        </>
                      ) : (
                        <>
                          <Merge className="mr-1.5 h-4 w-4" />
                          Merge {g.contacts.length} into 1
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
