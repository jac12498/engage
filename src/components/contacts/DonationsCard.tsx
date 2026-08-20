"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { HandCoins, Search, Trash2, Loader2 } from "lucide-react"
import { removeDonation } from "@/app/contacts/donor-actions"
import { FindDonationsModal } from "./FindDonationsModal"

export interface ContactDonationRow {
  id: string
  source: "ny" | "fec"
  refKey: string
  donorName: string | null
  recipient: string | null
  amount: number | null
  donationDate: string | null
  cycle: number | null
  city: string | null
  state: string | null
}

function money(n: number | null): string {
  if (n == null) return "—"
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 })
}

const SOURCE = {
  ny: { label: "NY State", cls: "bg-[#1b3a6b]/8 text-[#1b3a6b]" },
  fec: { label: "Federal", cls: "bg-[#6b1b5a]/10 text-[#6b1b5a]" },
} as const

export function DonationsCard({
  contactId,
  donations,
  searchable,
  canEdit,
  defaultName,
  defaultCity,
  defaultState,
  defaultZip,
}: {
  contactId: string
  donations: ContactDonationRow[]
  searchable: boolean
  canEdit: boolean
  defaultName: string
  defaultCity?: string
  defaultState?: string
  defaultZip?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()

  const total = donations.reduce((sum, d) => sum + (d.amount ?? 0), 0)
  const existingKeys = new Set(donations.map((d) => `${d.source}:${d.refKey}`))

  function remove(id: string) {
    start(async () => {
      await removeDonation(contactId, id)
      router.refresh()
    })
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#1a1a2e]">
          <HandCoins className="h-4 w-4 text-[#c4910a]" />
          Donations
          {donations.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              · {donations.length} · {money(total)} total
            </span>
          )}
        </h2>
        {searchable && canEdit && (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-[#1b3a6b] transition-colors hover:bg-muted"
          >
            <Search className="h-3.5 w-3.5" />
            Find donations
          </button>
        )}
      </div>

      {donations.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {searchable ? "No donations matched yet." : "Campaign-finance data isn't loaded on this environment yet."}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {donations.map((d) => (
            <li key={d.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#1a1a2e]">{money(d.amount)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SOURCE[d.source].cls}`}>
                    {SOURCE[d.source].label}
                    {d.cycle ? ` ${d.cycle}` : ""}
                  </span>
                  {d.donationDate && <span className="text-xs text-muted-foreground">{d.donationDate}</span>}
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {d.recipient ?? "Unknown recipient"}
                </p>
              </div>
              {canEdit && (
                <button
                  onClick={() => remove(d.id)}
                  disabled={pending}
                  title="Remove"
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && (
        <FindDonationsModal
          contactId={contactId}
          defaultName={defaultName}
          defaultCity={defaultCity}
          defaultState={defaultState}
          defaultZip={defaultZip}
          existingKeys={existingKeys}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
