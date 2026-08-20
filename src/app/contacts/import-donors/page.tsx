import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { requirePrivilege } from "@/lib/context"
import { prisma } from "@/lib/prisma"
import { getCommitteeDonors, getDonorSources, type CommitteeDonor } from "@/lib/committeeDonors"
import { ImportDonorsTable, type ImportDonorRow } from "@/components/contacts/ImportDonorsTable"

export const dynamic = "force-dynamic"

export default async function ImportDonorsPage({
  searchParams,
}: {
  searchParams: Promise<{ src?: string }>
}) {
  const { committee } = await requirePrivilege("contacts:create")
  const { src } = await searchParams

  // Sources = the committee itself + any candidate with its own committee filer id.
  const sources = await getDonorSources(committee.id)
  const active = sources.find((s) => s.key === src) ?? sources[0] ?? null
  const result = active ? await getCommitteeDonors(active.scope) : null

  return (
    <div>
      <Link
        href="/contacts"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-[#1a1a2e]"
      >
        <ArrowLeft className="h-4 w-4" />
        Contacts
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-[#1a1a2e]">Import committee donors</h1>
      <p className="mt-1 max-w-2xl text-muted-foreground">
        Add people who have contributed to <span className="font-medium text-[#1a1a2e]">{committee.name}</span> or
        one of its candidates&rsquo; committees to your contact list. Only donors of a committee you run appear here.
      </p>

      {sources.length > 1 && active && (
        <div className="mt-5 flex flex-wrap gap-2">
          {sources.map((s) => {
            const isActive = s.key === active.key
            return (
              <Link
                key={s.key}
                href={`/contacts/import-donors?src=${encodeURIComponent(s.key)}`}
                className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-[#1b3a6b] bg-[#1b3a6b] text-white"
                    : "border-border text-[#1a1a2e] hover:bg-muted"
                }`}
              >
                {s.label}
              </Link>
            )
          })}
        </div>
      )}

      {!active ? (
        <Notice reason="no-filer-id" />
      ) : result && result.available ? (
        <DonorsSection committeeId={committee.id} sourceKey={active.key} donors={result.donors} />
      ) : (
        <Notice reason={result ? result.reason : "no-filer-id"} />
      )}
    </div>
  )
}

async function DonorsSection({
  committeeId,
  sourceKey,
  donors,
}: {
  committeeId: string
  sourceKey: string
  donors: CommitteeDonor[]
}) {
  // Mark donors already in the list — by name, or by an already-imported contribution.
  const [existing, existingDonations] = await Promise.all([
    prisma.contact.findMany({ where: { committeeId }, select: { firstName: true, lastName: true } }),
    prisma.contactDonation.findMany({ where: { committeeId, source: "ny" }, select: { refKey: true } }),
  ])
  const nameKeys = new Set(
    existing.map((c) => `${c.firstName.trim().toUpperCase()}|${c.lastName.trim().toUpperCase()}`),
  )
  const importedRefKeys = new Set(existingDonations.map((d) => d.refKey))

  const rows: ImportDonorRow[] = donors.map((d) => ({
    key: d.key,
    name: [d.firstName, d.lastName].filter(Boolean).join(" ").trim() || d.lastName,
    location: [d.city, d.state].filter(Boolean).join(", ") || null,
    totalAmount: d.totalAmount,
    count: d.count,
    lastDate: d.lastDate,
    alreadyContact:
      nameKeys.has(`${d.firstName.trim().toUpperCase()}|${d.lastName.trim().toUpperCase()}`) ||
      d.contributions.some((c) => importedRefKeys.has(c.refKey)),
  }))

  return <ImportDonorsTable key={sourceKey} rows={rows} sourceKey={sourceKey} />
}

function Notice({ reason }: { reason: "no-filer-id" | "federal-unsupported" | "data-missing" }) {
  const copy: Record<typeof reason, { title: string; body: React.ReactNode }> = {
    "no-filer-id": {
      title: "Add a committee filer ID first",
      body: (
        <>
          To import donors we need a campaign-finance filer ID to scope the search to — your
          committee&rsquo;s (set it in Committee settings) or a candidate&rsquo;s (captured when you add the
          candidate). Add one, then come back.
        </>
      ),
    },
    "federal-unsupported": {
      title: "Federal donor import is coming soon",
      body: (
        <>Importing donors for federal (FEC) committees isn&rsquo;t available yet. State committees are supported today.</>
      ),
    },
    "data-missing": {
      title: "Campaign-finance data isn’t loaded",
      body: <>The disclosure data for your state isn&rsquo;t available on this environment yet.</>,
    },
  }
  const c = copy[reason]
  return (
    <div className="mt-8 rounded-2xl border border-border bg-white p-6">
      <h2 className="text-base font-semibold text-[#1a1a2e]">{c.title}</h2>
      <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">{c.body}</p>
    </div>
  )
}
