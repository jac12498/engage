import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requirePrivilege } from "@/lib/context"
import { getCommitteeTags } from "@/lib/committeeTags"
import { getContactFields } from "@/lib/committeeFields"
import { ContactDetail } from "@/components/contacts/ContactDetail"
import type { ContactRow } from "@/components/contacts/ContactsManager"
import { getVoterById, getVotingHistory, voterFileAvailable, type VoterRecord, type VotingHistory } from "@/lib/voters"
import { donationsSearchable } from "@/lib/donations"
import type { ContactDonationRow } from "@/components/contacts/DonationsCard"

export const dynamic = "force-dynamic"

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ contactId: string }>
}) {
  const { contactId } = await params
  const { committee, permissions } = await requirePrivilege("contacts:read")
  const tags = await getCommitteeTags(committee.id)
  const fields = await getContactFields(committee.id)

  const c = await prisma.contact.findFirst({
    where: { id: contactId, committeeId: committee.id },
    include: {
      emails: { orderBy: { order: "asc" } },
      phones: { orderBy: { order: "asc" } },
      addresses: { orderBy: { order: "asc" } },
      contactNotes: { orderBy: { createdAt: "desc" } },
      donations: { orderBy: { createdAt: "desc" } },
    },
  })
  if (!c) notFound()

  const contact: ContactRow = {
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    types: c.types,
    source: c.source,
    createdAt: c.createdAt.toISOString(),
    emails: c.emails.map((e) => ({ id: e.id, label: e.label, email: e.email })),
    phones: c.phones.map((p) => ({ id: p.id, label: p.label, phone: p.phone })),
    addresses: c.addresses.map((a) => ({
      id: a.id,
      label: a.label,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      state: a.state,
      zip: a.zip,
      lat: a.lat,
      lng: a.lng,
      placeId: a.placeId,
    })),
    notes: c.contactNotes.map((n) => ({
      id: n.id,
      body: n.body,
      createdAt: n.createdAt.toISOString(),
    })),
    customFields: (c.customFields as Record<string, unknown> | null) ?? {},
  }

  // Linked voter record (read from the voter parquets; degrades gracefully if absent).
  const voterAvailable = voterFileAvailable("ny")
  let voter: VoterRecord | null = null
  let votingHistory: VotingHistory | null = null
  if (c.stateVoterId && c.voterState) {
    voter = await getVoterById(c.voterState, c.stateVoterId)
    if (voter) votingHistory = await getVotingHistory(c.voterState, c.stateVoterId)
  }

  const donations: ContactDonationRow[] = c.donations.map((d) => ({
    id: d.id,
    source: d.source === "fec" ? "fec" : "ny",
    refKey: d.refKey,
    donorName: d.donorName,
    recipient: d.recipient,
    amount: d.amount,
    donationDate: d.donationDate,
    cycle: d.cycle,
    city: d.city,
    state: d.state,
  }))

  return (
    <ContactDetail
      contact={contact}
      tags={tags}
      fields={fields}
      voter={voter}
      votingHistory={votingHistory}
      voterAvailable={voterAvailable}
      canEditContacts={permissions.has("contacts:update")}
      donations={donations}
      donationsSearchable={donationsSearchable()}
    />
  )
}
