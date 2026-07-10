import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ContactsManager, type ContactRow } from "@/components/contacts/ContactsManager"

export const dynamic = "force-dynamic"

export default async function ContactsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      tags: { orderBy: { name: "asc" }, select: { name: true } },
      contacts: {
        orderBy: [{ createdAt: "desc" }],
        include: {
          emails: { orderBy: { order: "asc" } },
          phones: { orderBy: { order: "asc" } },
          addresses: { orderBy: { order: "asc" } },
          contactNotes: { orderBy: { createdAt: "desc" } },
          contactTags: { include: { tag: true } },
        },
      },
    },
  })
  if (!campaign) redirect("/onboarding")

  const contacts: ContactRow[] = campaign.contacts.map((c) => ({
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
  }))

  const allTags = campaign.tags.map((t) => t.name)

  const pendingSignups = await prisma.volunteerSignup.count({
    where: { website: { campaignId: campaign.id }, status: "pending" },
  })

  return <ContactsManager contacts={contacts} allTags={allTags} pendingSignups={pendingSignups} />
}
