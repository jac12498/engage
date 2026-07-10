"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { Plus, Search, Pencil, Trash2, X, Users, Inbox, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  saveContact,
  deleteContact,
  deleteContactNote,
  type EmailInput,
  type PhoneInput,
  type AddressInput,
} from "@/app/contacts/actions"
import { CONTACT_TYPES } from "@/lib/contacts"
import { AddressAutocomplete } from "@/components/contacts/AddressAutocomplete"
import type { ParsedAddress } from "@/lib/googleMaps"

export interface ContactEmail {
  id: string
  label: string
  email: string
}
export interface ContactPhone {
  id: string
  label: string
  phone: string
}
export interface ContactNote {
  id: string
  body: string
  createdAt: string
}
export interface ContactAddress {
  id: string
  label: string
  line1: string
  line2: string | null
  city: string | null
  state: string | null
  zip: string | null
  lat: number | null
  lng: number | null
  placeId: string | null
}
export interface ContactRow {
  id: string
  firstName: string
  lastName: string
  types: string[]
  source: string
  createdAt: string
  emails: ContactEmail[]
  phones: ContactPhone[]
  addresses: ContactAddress[]
  tags: string[]
  notes: ContactNote[]
}

const TYPE_LABELS: Record<string, string> = {
  supporter: "Supporter",
  volunteer: "Volunteer",
  donor: "Donor",
  voter: "Voter",
  prospect: "Prospect",
  other: "Other",
}

const TYPE_TONE: Record<string, string> = {
  supporter: "bg-[#1b3a6b]/8 text-[#1b3a6b]",
  volunteer: "bg-[#1e6b3a]/10 text-[#1e6b3a]",
  donor: "bg-[#c4910a]/12 text-[#8a6608]",
  voter: "bg-[#6b1b5a]/10 text-[#6b1b5a]",
  prospect: "bg-[#1a1a2e]/8 text-[#1a1a2e]",
  other: "bg-[#1a1a2e]/6 text-muted-foreground",
}

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  volunteer_signup: "Website",
  import: "Import",
}

const EMAIL_LABELS = ["Personal", "Work", "Campaign", "Other"]
const PHONE_LABELS = ["Mobile", "Home", "Work", "Campaign", "Other"]
const ADDRESS_LABELS = ["Home", "Mailing", "Business", "Other"]

function fullName(c: ContactRow) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ")
}
function location(c: ContactRow) {
  const a = c.addresses[0]
  if (!a) return ""
  const cityState = [a.city, a.state].filter(Boolean).join(", ")
  return [a.line1, cityState].filter(Boolean).join(" · ")
}
function addressText(a: ContactAddress) {
  return [a.line1, a.line2, a.city, a.state, a.zip].filter(Boolean).join(" ")
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

export function ContactsManager({
  contacts,
  allTags,
  pendingSignups,
}: {
  contacts: ContactRow[]
  allTags: string[]
  pendingSignups: number
}) {
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [editing, setEditing] = useState<ContactRow | "new" | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return contacts.filter((c) => {
      if (typeFilter !== "all" && !c.types.includes(typeFilter)) return false
      if (!q) return true
      const hay = [
        fullName(c),
        c.addresses.map(addressText).join(" "),
        c.tags.join(" "),
        c.emails.map((e) => e.email).join(" "),
        c.phones.map((p) => p.phone).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [contacts, query, typeFilter])

  // Per-type counts for the filter chips.
  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of contacts) for (const t of c.types) m[t] = (m[t] ?? 0) + 1
    return m
  }, [contacts])

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Contacts</h1>
          <p className="mt-1 text-muted-foreground">
            {contacts.length === 0
              ? "Your unified contact list — donors, volunteers, and supporters in one place."
              : `${contacts.length} ${contacts.length === 1 ? "contact" : "contacts"}`}
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add contact
        </Button>
      </div>

      {pendingSignups > 0 && (
        <Link
          href="/contacts/signups"
          className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-[#c4910a]/30 bg-[#f0b429]/10 px-4 py-3 transition-colors hover:bg-[#f0b429]/15"
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[#8a6608]">
            <Inbox className="h-4 w-4" />
            {pendingSignups} volunteer {pendingSignups === 1 ? "signup" : "signups"} waiting for review
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#8a6608]">
            Review
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      )}

      {contacts.length === 0 ? (
        <EmptyState onAdd={() => setEditing("new")} />
      ) : (
        <>
          {/* Search */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, phone, tag…"
                className="w-full rounded-lg border border-border bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"
              />
            </div>
          </div>

          {/* Type filter chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip label="All" count={contacts.length} active={typeFilter === "all"} onClick={() => setTypeFilter("all")} />
            {CONTACT_TYPES.filter((t) => counts[t]).map((t) => (
              <Chip
                key={t}
                label={TYPE_LABELS[t]}
                count={counts[t]}
                active={typeFilter === t}
                onClick={() => setTypeFilter(t)}
              />
            ))}
          </div>

          {/* Table */}
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-white">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Types</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3 align-top">
                      <Link
                        href={`/contacts/${c.id}`}
                        className="font-medium text-[#1a1a2e] hover:text-[#1b3a6b] hover:underline"
                      >
                        {fullName(c)}
                      </Link>
                      {c.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.tags.map((t) => (
                            <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-1">
                        {c.types.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                        {c.types.map((t) => (
                          <span
                            key={t}
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_TONE[t] ?? TYPE_TONE.other}`}
                          >
                            {TYPE_LABELS[t] ?? t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground">
                      <MethodCell
                        primary={c.emails[0] ? { value: c.emails[0].email, label: c.emails[0].label, href: `mailto:${c.emails[0].email}` } : null}
                        extra={c.emails.length - 1}
                      />
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground">
                      <MethodCell
                        primary={c.phones[0] ? { value: c.phones[0].phone, label: c.phones[0].label, href: `tel:${c.phones[0].phone}` } : null}
                        extra={c.phones.length - 1}
                      />
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground">{location(c) || "—"}</td>
                    <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                      {SOURCE_LABELS[c.source] ?? c.source}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditing(c)}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-[#1b3a6b]"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <DeleteButton id={c.id} name={fullName(c)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No contacts match your search.
              </p>
            )}
          </div>
        </>
      )}

      {editing && (
        <ContactDialog
          contact={editing === "new" ? null : editing}
          allTags={allTags}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function MethodCell({
  primary,
  extra,
}: {
  primary: { value: string; label: string; href: string } | null
  extra: number
}) {
  if (!primary) return <>—</>
  return (
    <div>
      <a href={primary.href} className="hover:text-[#1b3a6b] hover:underline">
        {primary.value}
      </a>
      <div className="text-xs text-muted-foreground/70">
        {primary.label}
        {extra > 0 ? ` · +${extra} more` : ""}
      </div>
    </div>
  )
}

function Chip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-[#1b3a6b] bg-[#1b3a6b] text-white"
          : "border-border bg-white text-muted-foreground hover:border-[#1b3a6b]/40"
      }`}
    >
      {label}
      <span className={active ? "text-white/70" : "text-muted-foreground/70"}>{count}</span>
    </button>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border bg-white/60 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1b3a6b]/5 text-[#1b3a6b]">
        <Users className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-[#1a1a2e]">No contacts yet</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Add your first contact, or they&rsquo;ll start flowing in automatically from your website&rsquo;s
        volunteer signups.
      </p>
      <Button className="mt-5" onClick={onAdd}>
        <Plus className="mr-1.5 h-4 w-4" />
        Add contact
      </Button>
    </div>
  )
}

function DeleteButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition()
  function handleDelete() {
    if (!confirm(`Delete ${name || "this contact"}? This can't be undone.`)) return
    startTransition(async () => {
      await deleteContact(id)
    })
  }
  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      aria-label="Delete"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}

const fieldBase =
  "rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-[#1a1a2e] outline-none transition-colors focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"
const inputCls = `w-full ${fieldBase}`

// ── Add / Edit dialog ─────────────────────────────────────────────────────────

interface MethodRow {
  key: string
  label: string
  value: string
}

interface AddressRow {
  key: string
  label: string
  line1: string
  line2: string
  city: string
  state: string
  zip: string
  lat: number | null
  lng: number | null
  placeId: string | null
}

let rowSeq = 0
const newRow = (label = "", value = ""): MethodRow => ({ key: `r${rowSeq++}`, label, value })
const newAddress = (label = "Home"): AddressRow => ({
  key: `a${rowSeq++}`,
  label,
  line1: "",
  line2: "",
  city: "",
  state: "",
  zip: "",
  lat: null,
  lng: null,
  placeId: null,
})

export function ContactDialog({
  contact,
  allTags,
  onClose,
}: {
  contact: ContactRow | null
  allTags: string[]
  onClose: () => void
}) {
  const [firstName, setFirstName] = useState(contact?.firstName ?? "")
  const [lastName, setLastName] = useState(contact?.lastName ?? "")
  const [types, setTypes] = useState<string[]>(contact?.types ?? [])
  const [emails, setEmails] = useState<MethodRow[]>(
    contact?.emails.length ? contact.emails.map((e) => newRow(e.label, e.email)) : [newRow("Personal")]
  )
  const [phones, setPhones] = useState<MethodRow[]>(
    contact?.phones.length ? contact.phones.map((p) => newRow(p.label, p.phone)) : [newRow("Mobile")]
  )
  const [addresses, setAddresses] = useState<AddressRow[]>(
    contact?.addresses.length
      ? contact.addresses.map((a) => ({
          key: `a${rowSeq++}`,
          label: a.label,
          line1: a.line1,
          line2: a.line2 ?? "",
          city: a.city ?? "",
          state: a.state ?? "",
          zip: a.zip ?? "",
          lat: a.lat,
          lng: a.lng,
          placeId: a.placeId,
        }))
      : []
  )
  const [tags, setTags] = useState<string[]>(contact?.tags ?? [])
  const [notes, setNotes] = useState<ContactNote[]>(contact?.notes ?? [])
  const [newNote, setNewNote] = useState("")

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggleType(t: string) {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  function handleSave() {
    setError(null)
    if (!firstName.trim()) return setError("First name is required.")
    if (!lastName.trim()) return setError("Last name is required.")

    const emailInput: EmailInput[] = emails.map((e) => ({ label: e.label, email: e.value }))
    const phoneInput: PhoneInput[] = phones.map((p) => ({ label: p.label, phone: p.value }))
    const addressInput: AddressInput[] = addresses.map((a) => ({
      label: a.label,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      state: a.state,
      zip: a.zip,
      lat: a.lat,
      lng: a.lng,
      placeId: a.placeId,
    }))

    startTransition(async () => {
      const result = await saveContact({
        id: contact?.id,
        firstName,
        lastName,
        types,
        emails: emailInput,
        phones: phoneInput,
        addresses: addressInput,
        tags,
        newNote,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      onClose()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-[#1a1a2e]">
            {contact ? "Edit contact" : "Add contact"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-[#1a1a2e]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          {/* Name */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" required>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Last name" required>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
            </Field>
          </div>

          {/* Types */}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">Types</span>
            <div className="flex flex-wrap gap-2">
              {CONTACT_TYPES.map((t) => {
                const active = types.includes(t)
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "border-[#1b3a6b] bg-[#1b3a6b] text-white"
                        : "border-border bg-white text-muted-foreground hover:border-[#1b3a6b]/40"
                    }`}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Emails */}
          <MethodEditor
            title="Emails"
            rows={emails}
            setRows={setEmails}
            labelList={EMAIL_LABELS}
            valuePlaceholder="jane@example.com"
            valueType="email"
            addLabel="Add email"
            defaultLabel="Personal"
          />

          {/* Phones */}
          <MethodEditor
            title="Phone numbers"
            rows={phones}
            setRows={setPhones}
            labelList={PHONE_LABELS}
            valuePlaceholder="(555) 123-4567"
            valueType="tel"
            addLabel="Add phone"
            defaultLabel="Mobile"
          />

          {/* Addresses */}
          <AddressEditor rows={addresses} setRows={setAddresses} />

          {/* Tags */}
          <TagEditor tags={tags} setTags={setTags} allTags={allTags} />

          {/* Notes */}
          <NotesSection notes={notes} setNotes={setNotes} newNote={newNote} setNewNote={setNewNote} />

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e]"
          >
            Cancel
          </button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving…" : contact ? "Save changes" : "Add contact"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function MethodEditor({
  title,
  rows,
  setRows,
  labelList,
  valuePlaceholder,
  valueType,
  addLabel,
  defaultLabel,
}: {
  title: string
  rows: MethodRow[]
  setRows: React.Dispatch<React.SetStateAction<MethodRow[]>>
  labelList: string[]
  valuePlaceholder: string
  valueType: string
  addLabel: string
  defaultLabel: string
}) {
  const listId = `labels-${title.replace(/\s+/g, "-").toLowerCase()}`
  function update(key: string, patch: Partial<MethodRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }
  function remove(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key))
  }
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">{title}</span>
      <datalist id={listId}>
        {labelList.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.key} className="flex gap-2">
            <input
              value={r.label}
              onChange={(e) => update(r.key, { label: e.target.value })}
              list={listId}
              placeholder="Label"
              className={`${fieldBase} w-28 shrink-0`}
            />
            <input
              value={r.value}
              onChange={(e) => update(r.key, { value: e.target.value })}
              type={valueType}
              placeholder={valuePlaceholder}
              className={`${fieldBase} min-w-0 flex-1`}
            />
            <button
              type="button"
              onClick={() => remove(r.key)}
              className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label={`Remove ${title}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, newRow(defaultLabel)])}
        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#1b3a6b] hover:underline"
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </button>
    </div>
  )
}

function AddressEditor({
  rows,
  setRows,
}: {
  rows: AddressRow[]
  setRows: React.Dispatch<React.SetStateAction<AddressRow[]>>
}) {
  function update(key: string, patch: Partial<AddressRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }
  function remove(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key))
  }
  // When a place is picked, fill the structured fields (don't clobber a value the
  // user already typed with a blank from Google).
  function applyPlace(key: string, p: ParsedAddress) {
    update(key, {
      city: p.city || undefined,
      state: p.state || undefined,
      zip: p.zip || undefined,
      lat: p.lat,
      lng: p.lng,
      placeId: p.placeId,
    })
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">Addresses</span>
      <datalist id="address-labels">
        {ADDRESS_LABELS.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.key} className="rounded-xl border border-border p-3">
            <div className="flex items-center gap-2">
              <input
                value={r.label}
                onChange={(e) => update(r.key, { label: e.target.value })}
                list="address-labels"
                placeholder="Label"
                className={`${fieldBase} w-32 shrink-0`}
              />
              <AddressAutocomplete
                value={r.line1}
                onChange={(line1) => update(r.key, { line1 })}
                onResolve={(p) => applyPlace(r.key, p)}
                placeholder="Street address"
                className={`${fieldBase} min-w-0 flex-1`}
              />
              <button
                type="button"
                onClick={() => remove(r.key)}
                className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label="Remove address"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              value={r.line2}
              onChange={(e) => update(r.key, { line2: e.target.value })}
              placeholder="Apt, suite, unit (optional)"
              className={`${inputCls} mt-2`}
            />
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <input
                value={r.city}
                onChange={(e) => update(r.key, { city: e.target.value })}
                placeholder="City"
                className={inputCls}
              />
              <input
                value={r.state}
                onChange={(e) => update(r.key, { state: e.target.value })}
                placeholder="State"
                className={inputCls}
              />
              <input
                value={r.zip}
                onChange={(e) => update(r.key, { zip: e.target.value })}
                placeholder="ZIP"
                className={inputCls}
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, newAddress()])}
        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#1b3a6b] hover:underline"
      >
        <Plus className="h-3.5 w-3.5" />
        Add address
      </button>
    </div>
  )
}

function TagEditor({
  tags,
  setTags,
  allTags,
}: {
  tags: string[]
  setTags: React.Dispatch<React.SetStateAction<string[]>>
  allTags: string[]
}) {
  const [draft, setDraft] = useState("")

  function add(name: string) {
    const t = name.trim()
    if (!t) return
    setTags((prev) => (prev.some((x) => x.toLowerCase() === t.toLowerCase()) ? prev : [...prev, t]))
    setDraft("")
  }
  function remove(name: string) {
    setTags((prev) => prev.filter((x) => x !== name))
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">Tags</span>
      {tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-[#1b3a6b]/8 px-2.5 py-1 text-xs font-medium text-[#1b3a6b]"
            >
              {t}
              <button type="button" onClick={() => remove(t)} aria-label={`Remove ${t}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            add(draft)
          } else if (e.key === "Backspace" && !draft && tags.length) {
            remove(tags[tags.length - 1])
          }
        }}
        onBlur={() => add(draft)}
        list="all-tags"
        placeholder="Type a tag and press Enter"
        className={inputCls}
      />
      <datalist id="all-tags">
        {allTags.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </div>
  )
}

function NotesSection({
  notes,
  setNotes,
  newNote,
  setNewNote,
}: {
  notes: ContactNote[]
  setNotes: React.Dispatch<React.SetStateAction<ContactNote[]>>
  newNote: string
  setNewNote: (v: string) => void
}) {
  const [, startTransition] = useTransition()

  function handleDelete(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id)) // optimistic
    startTransition(async () => {
      await deleteContactNote(id)
    })
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">Notes</span>
      {notes.length > 0 && (
        <ul className="mb-2 space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <p className="whitespace-pre-wrap text-sm text-[#1a1a2e]">{n.body}</p>
                <button
                  type="button"
                  onClick={() => handleDelete(n.id)}
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
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
      <textarea
        value={newNote}
        onChange={(e) => setNewNote(e.target.value)}
        rows={2}
        placeholder="Add a note… (saved with the contact)"
        className={`${inputCls} resize-y`}
      />
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
    </label>
  )
}
