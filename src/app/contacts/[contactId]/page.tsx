import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireCommittee } from "@/lib/context"
import { ContactDetail } from "@/components/contacts/ContactDetail"
import type { ContactRow } from "@/components/contacts/ContactsManager"

export const dynamic = "force-dynamic"

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ contactId: string }>
}) {
  const { contactId } = await params
  const { committee } = await requireCommittee()

  const tags = await prisma.tag.findMany({
    where: { committeeId: committee.id },
    orderBy: { name: "asc" },
    select: { name: true },
  })

  const c = await prisma.contact.findFirst({
    where: { id: contactId, committeeId: committee.id },
    include: {
      emails: { orderBy: { order: "asc" } },
      phones: { orderBy: { order: "asc" } },
      addresses: { orderBy: { order: "asc" } },
      contactNotes: { orderBy: { createdAt: "desc" } },
      contactTags: { include: { tag: true } },
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
    tags: c.contactTags.map((ct) => ct.tag.name),
    notes: c.contactNotes.map((n) => ({
      id: n.id,
      body: n.body,
      createdAt: n.createdAt.toISOString(),
    })),
  }

  return <ContactDetail contact={contact} allTags={tags.map((t) => t.name)} />
}
