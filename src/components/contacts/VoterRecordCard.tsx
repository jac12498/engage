"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Vote, Search, Link2Off, Loader2 } from "lucide-react"
import { unlinkVoter } from "@/app/contacts/voter-actions"
import { LinkVoterModal } from "./LinkVoterModal"
import type { VoterRecord, VotingHistory } from "@/lib/voters"

const METHOD_LABELS: Record<string, string> = {
  A: "Absentee",
  E: "Early",
  M: "Mail",
  P: "In person",
  X: "Affidavit",
}

export function VoterRecordCard({
  contactId,
  defaultName,
  defaultCity,
  defaultZip,
  voter,
  history,
  available,
  canEdit,
}: {
  contactId: string
  defaultName: string
  defaultCity?: string
  defaultZip?: string
  voter: VoterRecord | null
  history: VotingHistory | null
  available: boolean
  canEdit: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [unlinking, start] = useTransition()

  function unlink() {
    start(async () => {
      await unlinkVoter(contactId)
      router.refresh()
    })
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#1a1a2e]">
          <Vote className="h-4 w-4 text-[#6b1b5a]" />
          Voter record
        </h2>
        {voter && canEdit && (
          <button
            onClick={unlink}
            disabled={unlinking}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {unlinking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2Off className="h-3.5 w-3.5" />}
            Unlink
          </button>
        )}
      </div>

      {voter ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-[#1a1a2e]">
              {[voter.firstName, voter.middleName, voter.lastName].filter(Boolean).join(" ")}
            </span>
            {voter.partyLabel && (
              <span className="rounded-full bg-[#6b1b5a]/10 px-2 py-0.5 text-xs font-semibold text-[#6b1b5a]">
                {voter.partyLabel}
              </span>
            )}
            {voter.statusLabel && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {voter.statusLabel}
              </span>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
            <Field label="Residence">{[voter.address, [voter.city, voter.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—"}</Field>
            <Field label="County">{voter.countyLabel ?? "—"}</Field>
            <Field label="Registered">{voter.registrationDate ?? "—"}</Field>
            <Field label="Congressional">{voter.districtCd ? `CD ${voter.districtCd}` : "—"}</Field>
            <Field label="State Senate">{voter.districtSd ? `SD ${voter.districtSd}` : "—"}</Field>
            <Field label="Assembly">{voter.districtAd ? `AD ${voter.districtAd}` : "—"}</Field>
          </dl>

          {history && history.count > 0 && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Voting history · {history.count} election{history.count === 1 ? "" : "s"}
                {history.lastYear ? ` · last ${history.lastYear}` : ""}
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {history.elections.slice(0, 8).map((e, i) => (
                  <li key={`${e.electionCode}-${e.electionYear}-${i}`} className="flex items-center justify-between gap-2">
                    <span className="text-[#1a1a2e]">
                      {e.electionYear ?? "—"}{" "}
                      <span className="text-muted-foreground">
                        {e.isStandardized ? e.electionCode : e.electionCode}
                        {e.electionTypeHint ? ` · ${e.electionTypeHint.toLowerCase().replace(/_/g, " ")}` : ""}
                      </span>
                    </span>
                    {e.voteMethod && (
                      <span className="shrink-0 text-xs text-muted-foreground">{METHOD_LABELS[e.voteMethod] ?? e.voteMethod}</span>
                    )}
                  </li>
                ))}
              </ul>
              {history.count > 8 && (
                <p className="mt-1 text-xs text-muted-foreground">+ {history.count - 8} more</p>
              )}
            </div>
          )}
          {voter.stateVoterId && (
            <p className="text-xs text-muted-foreground">State voter ID: <span className="font-mono">{voter.stateVoterId}</span></p>
          )}
        </div>
      ) : !available ? (
        <p className="mt-2 text-sm text-muted-foreground">The voter file isn&rsquo;t loaded on this environment yet.</p>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Not linked to a voter record.</p>
          {canEdit && (
            <button
              onClick={() => setOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-[#1b3a6b] transition-colors hover:bg-muted"
            >
              <Search className="h-3.5 w-3.5" />
              Find voter record
            </button>
          )}
        </div>
      )}

      {open && (
        <LinkVoterModal
          contactId={contactId}
          defaultName={defaultName}
          defaultCity={defaultCity}
          defaultZip={defaultZip}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-[#1a1a2e]">{children}</dd>
    </div>
  )
}
