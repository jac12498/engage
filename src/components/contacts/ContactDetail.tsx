"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageSquare,
  Pencil,
  Trash2,
  MapPin,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ContactDialog,
  type ContactRow,
  type ContactAddress,
} from "@/components/contacts/ContactsManager"
import { addContactNote, deleteContact, deleteContactNote } from "@/app/contacts/actions"
import { formatPhone } from "@/lib/contacts"
import { buildTagMap, tagBadgeStyle, type TagDef } from "@/lib/tags"
import { formatFieldValue, isEmptyValue, type ContactFieldDef } from "@/lib/contactFields"
import { VoterRecordCard } from "@/components/contacts/VoterRecordCard"
import type { VoterRecord, VotingHistory } from "@/lib/voters"
import { DonationsCard, type ContactDonationRow } from "@/components/contacts/DonationsCard"

const SOURCE_LABELS: Record<string, string> = {
  manual: "Added manually",
  volunteer_signup: "From website signup",
  import: "Imported",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function mapsUrl(a: ContactAddress) {
  const query = encodeURIComponent(
    [a.line1, a.line2, a.city, a.state, a.zip].filter(Boolean).join(", ")
  )
  const base = `https://www.google.com/maps/search/?api=1&query=${query}`
  return a.placeId ? `${base}&query_place_id=${encodeURIComponent(a.placeId)}` : base
}

export function ContactDetail({
  contact,
  tags,
  fields,
  voter = null,
  votingHistory = null,
  voterAvailable = false,
  canEditContacts = false,
  donations = [],
  donationsSearchable = false,
}: {
  contact: ContactRow
  tags: TagDef[]
  fields: ContactFieldDef[]
  voter?: VoterRecord | null
  votingHistory?: VotingHistory | null
  voterAvailable?: boolean
  canEditContacts?: boolean
  donations?: ContactDonationRow[]
  donationsSearchable?: boolean
}) {
  const router = useRouter()
  const tagMap = buildTagMap(tags)
  const [editing, setEditing] = useState(false)
  const [noteDraft, setNoteDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ")
  const primaryEmail = contact.emails[0]?.email
  const primaryPhone = contact.phones[0]?.phone

  function addNote() {
    const text = noteDraft.trim()
    if (!text) return
    setError(null)
    startTransition(async () => {
      const r = await addContactNote(contact.id, text)
      if (!r.ok) return setError(r.error ?? "Couldn't add note.")
      setNoteDraft("")
    })
  }

  function removeNote(id: string) {
    startTransition(async () => {
      await deleteContactNote(id)
    })
  }

  function handleDelete() {
    if (!confirm(`Delete ${name}? This can't be undone.`)) return
    setError(null)
    startTransition(async () => {
      const r = await deleteContact(contact.id)
      if (r.ok) router.push("/contacts")
      else setError(r.error ?? "Couldn't delete contact.")
    })
  }

  return (
    <div>
      <Link
        href="/contacts"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to contacts
      </Link>

      {/* Header */}
      <div className="mt-3 rounded-2xl border border-border bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a2e]">{name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {contact.types.map((t) => {
                const def = tagMap.get(t)
                return (
                  <span
                    key={t}
                    className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={tagBadgeStyle(def?.color ?? "#6b7280")}
                  >
                    {def?.label ?? t}
                  </span>
                )
              })}
              <span className="text-xs text-muted-foreground">
                {SOURCE_LABELS[contact.source] ?? contact.source} · {formatDate(contact.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-[#1a1a2e] transition-colors hover:bg-muted"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-5 flex flex-wrap gap-2">
          <ActionButton
            href={primaryEmail ? `mailto:${primaryEmail}` : undefined}
            icon={<Mail className="h-4 w-4" />}
            label="Email"
          />
          <ActionButton
            href={primaryPhone ? `tel:${primaryPhone}` : undefined}
            icon={<Phone className="h-4 w-4" />}
            label="Call"
          />
          <ActionButton
            href={primaryPhone ? `sms:${primaryPhone}` : undefined}
            icon={<MessageSquare className="h-4 w-4" />}
            label="Text"
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Contact info + Addresses */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Contact info">
          {contact.emails.length === 0 && contact.phones.length === 0 ? (
            <p className="text-sm text-muted-foreground">No email or phone on file.</p>
          ) : (
            <ul className="space-y-3">
              {contact.emails.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{e.label}</div>
                    <a href={`mailto:${e.email}`} className="text-sm text-[#1a1a2e] hover:text-[#1b3a6b] hover:underline">
                      {e.email}
                    </a>
                  </div>
                  <a
                    href={`mailto:${e.email}`}
                    className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-[#1b3a6b]"
                    aria-label={`Email ${e.email}`}
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                </li>
              ))}
              {contact.phones.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{p.label}</div>
                    <a href={`tel:${p.phone}`} className="text-sm text-[#1a1a2e] hover:text-[#1b3a6b] hover:underline">
                      {formatPhone(p.phone)}
                    </a>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <a
                      href={`tel:${p.phone}`}
                      className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-[#1b3a6b]"
                      aria-label={`Call ${p.phone}`}
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                    <a
                      href={`sms:${p.phone}`}
                      className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-[#1b3a6b]"
                      aria-label={`Text ${p.phone}`}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Addresses">
          {contact.addresses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No addresses on file.</p>
          ) : (
            <ul className="space-y-3">
              {contact.addresses.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{a.label}</div>
                    <div className="text-sm text-[#1a1a2e]">
                      <div>{a.line1}</div>
                      {a.line2 && <div>{a.line2}</div>}
                      <div>{[a.city, a.state, a.zip].filter(Boolean).join(", ")}</div>
                    </div>
                  </div>
                  <a
                    href={mapsUrl(a)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-[#1b3a6b]"
                    aria-label="Open in Google Maps"
                  >
                    <MapPin className="h-4 w-4" />
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Custom Fields */}
      {fields.some((f) => !isEmptyValue(contact.customFields[f.id])) && (
        <div className="mt-4 rounded-2xl border border-border bg-white p-6">
          <h2 className="text-sm font-semibold text-[#1a1a2e]">Custom Fields</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {fields
              .filter((f) => !isEmptyValue(contact.customFields[f.id]))
              .map((f) => {
                const val = contact.customFields[f.id]
                return (
                  <div key={f.id}>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</dt>
                    <dd className="text-sm text-[#1a1a2e]">
                      {f.type === "url" ? (
                        <a href={String(val)} target="_blank" rel="noopener noreferrer" className="text-[#1b3a6b] underline underline-offset-2 break-all">
                          {formatFieldValue(f.type, val)}
                        </a>
                      ) : (
                        formatFieldValue(f.type, val)
                      )}
                    </dd>
                  </div>
                )
              })}
          </dl>
        </div>
      )}

      {/* Notes (full width) */}
      <div className="mt-4">
        <Card title="Notes">
          <div className="flex gap-2">
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={2}
              placeholder="Log a call, add a reminder…"
              className="min-w-0 flex-1 resize-y rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-[#1a1a2e] outline-none transition-colors focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"
            />
            <Button onClick={addNote} disabled={isPending || !noteDraft.trim()}>
              Add
            </Button>
          </div>

          {contact.notes.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No notes yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {contact.notes.map((n) => (
                <li key={n.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="whitespace-pre-wrap text-sm text-[#1a1a2e]">{n.body}</p>
                    <button
                      onClick={() => removeNote(n.id)}
                      disabled={isPending}
                      className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      aria-label="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Voter Record + Donations */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <VoterRecordCard
          contactId={contact.id}
          defaultName={name}
          defaultCity={contact.addresses[0]?.city ?? undefined}
          defaultZip={contact.addresses[0]?.zip ?? undefined}
          voter={voter}
          history={votingHistory}
          available={voterAvailable}
          canEdit={canEditContacts}
        />
        <DonationsCard
          contactId={contact.id}
          donations={donations}
          searchable={donationsSearchable}
          canEdit={canEditContacts}
          defaultName={name}
          defaultCity={contact.addresses[0]?.city ?? undefined}
          defaultState={contact.addresses[0]?.state ?? undefined}
          defaultZip={contact.addresses[0]?.zip ?? undefined}
        />
      </div>

      {editing && (
        <ContactDialog
          contact={contact}
          tags={tags}
          fields={fields}
          onClose={() => {
            setEditing(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function ActionButton({
  href,
  icon,
  label,
}: {
  href?: string
  icon: React.ReactNode
  label: string
}) {
  if (!href) {
    return (
      <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-muted-foreground/50">
        {icon}
        {label}
      </span>
    )
  }
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[#1b3a6b]/20 bg-[#1b3a6b]/5 px-3.5 py-2 text-sm font-semibold text-[#1b3a6b] transition-colors hover:bg-[#1b3a6b]/10"
    >
      {icon}
      {label}
    </a>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </div>
  )
}
