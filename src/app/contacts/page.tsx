import { prisma } from "@/lib/prisma"
import { requirePrivilege } from "@/lib/context"
import { detectDuplicateClusters } from "@/lib/contactsDuplicates"
import type { SearchQuery } from "@/lib/contactsSearch"
import { ContactsManager, type ContactRow } from "@/components/contacts/ContactsManager"

export const dynamic = "force-dynamic"

export default async function ContactsPage() {
  const { committee, permissions } = await requirePrivilege("contacts:read")

  const contactRows = await prisma.contact.findMany({
    where: { committeeId: committee.id },
    orderBy: [{ createdAt: "desc" }],
    include: {
      emails: { orderBy: { order: "asc" } },
      phones: { orderBy: { order: "asc" } },
      addresses: { orderBy: { order: "asc" } },
      contactNotes: { orderBy: { createdAt: "desc" } },
    },
  })

  const contacts: ContactRow[] = contactRows.map((c) => ({
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
  }))

  // Pending signups across every campaign website in the committee.
  const pendingSignups = await prisma.volunteerSignup.count({
    where: { website: { committeeId: committee.id }, status: "pending" },
  })

  // Donor import is available if there's any filer id to scope to — the committee's own,
  // or one of its candidates' committees.
  const candidateFilers = await prisma.campaign.count({
    where: { candidate: { committeeId: committee.id }, filerId: { not: null } },
  })
  const canImportDonors =
    permissions.has("contacts:create") && (!!committee.filerId || candidateFilers > 0)

  // Possible-duplicate groups (only surface to members who can act on them).
  const duplicateGroups = permissions.has("contacts:update")
    ? (await detectDuplicateClusters(committee.id)).length
    : 0

  const savedSearchRows = await prisma.contactSavedSearch.findMany({
    where: { committeeId: committee.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, query: true },
  })
  const savedSearches = savedSearchRows.map((s) => ({ id: s.id, name: s.name, query: s.query as unknown as SearchQuery }))

  return (
    <ContactsManager
      contacts={contacts}
      pendingSignups={pendingSignups}
      canImportDonors={canImportDonors}
      canImport={permissions.has("contacts:create")}
      duplicateGroups={duplicateGroups}
      savedSearches={savedSearches}
    />
  )
}
