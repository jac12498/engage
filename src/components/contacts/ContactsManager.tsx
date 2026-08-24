"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { Plus, Search, Pencil, Trash2, X, Users, Inbox, ArrowRight, HandCoins, ChevronLeft, ChevronRight, Upload, SlidersHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"
import { ContactSearchBuilder } from "@/components/contacts/ContactSearchBuilder"
import { ContactListActions } from "@/components/contacts/ContactListActions"
import { matchContact, conditionCount, type SearchQuery } from "@/lib/contactsSearch"
import { saveContactSearch, updateContactSearch, deleteContactSearch } from "@/app/contacts/searches/actions"

export interface SavedSearch {
  id: string
  name: string
  query: SearchQuery
}
import { Button } from "@/components/ui/button"
import {
  saveContact,
  deleteContact,
  deleteContactNote,
  type EmailInput,
  type PhoneInput,
  type AddressInput,
} from "@/app/contacts/actions"
import { formatPhone, EMAIL_LABELS, PHONE_LABELS, ADDRESS_LABELS } from "@/lib/contacts"
import { tagBadgeStyle, buildTagMap, type TagDef } from "@/lib/tags"
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
  notes: ContactNote[]
}

function fullName(c: ContactRow) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ")
}
/** Display form for the Name column: "Last, First" (falls back gracefully). */
function nameLastFirst(c: ContactRow) {
  const last = c.lastName?.trim()
  const first = c.firstName?.trim()
  if (last && first) return `${last}, ${first}`
  return last || first || ""
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

/** Sort value for a contact: last name, then first name (lowercased). */
function sortValue(c: ContactRow): string {
  return [c.lastName, c.firstName].filter(Boolean).join(" ").toLowerCase()
}

/** A contact's last-name initial for the A–Z quick filter ("#" for non-letters/blank). */
function lastInitial(c: ContactRow): string {
  const ch = (c.lastName || "").trim().charAt(0).toUpperCase()
  return /[A-Z]/.test(ch) ? ch : "#"
}

export function ContactsManager({
  contacts,
  tags,
  pendingSignups,
  canImportDonors = false,
  canImport = false,
  canDelete = false,
  canTag = false,
  duplicateGroups = 0,
  savedSearches = [],
}: {
  contacts: ContactRow[]
  /** The committee's effective tag list (built-ins + custom). */
  tags: TagDef[]
  pendingSignups: number
  canImportDonors?: boolean
  /** May the user bulk-load a list (contacts:create)? */
  canImport?: boolean
  /** May the user delete contacts (contacts:delete)? Enables bulk delete. */
  canDelete?: boolean
  /** May the user edit contacts (contacts:update)? Enables bulk tagging. */
  canTag?: boolean
  /** Number of possible-duplicate groups detected (0 hides the banner). */
  duplicateGroups?: number
  /** Committee-shared saved advanced searches. */
  savedSearches?: SavedSearch[]
}) {
  const [query, setQuery] = useState("")
  // Multi-select tag filter: the set of selected tag codes (empty = show all).
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<ContactRow | "new" | null>(null)

  function toggleTypeFilter(t: string) {
    setTypeFilter((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  // Alphabetic (last-name initial) quick filter, and pagination.
  const [letter, setLetter] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState(50)
  const [page, setPage] = useState(1)

  // Advanced search builder (groups OR'd, conditions AND'd).
  const [advOpen, setAdvOpen] = useState(false)
  const [advQuery, setAdvQuery] = useState<SearchQuery>([])
  const advCount = conditionCount(advQuery)

  // Saved (committee-shared) searches.
  const router = useRouter()
  const [activeSearchId, setActiveSearchId] = useState("")
  const [naming, setNaming] = useState<null | "save" | "rename">(null)
  const [nameDraft, setNameDraft] = useState("")
  const [confirmDeleteSearch, setConfirmDeleteSearch] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchPending, startSearchTransition] = useTransition()
  const activeSearch = savedSearches.find((s) => s.id === activeSearchId) ?? null

  function loadSearch(id: string) {
    setSearchError(null)
    setNaming(null)
    if (!id) return setActiveSearchId("")
    const s = savedSearches.find((x) => x.id === id)
    if (!s) return
    setActiveSearchId(id)
    setAdvQuery(JSON.parse(JSON.stringify(s.query)) as SearchQuery)
    setAdvOpen(true)
  }
  function clearSearch() {
    setAdvQuery([])
    setActiveSearchId("")
    setNaming(null)
    setSearchError(null)
  }
  function startNaming(mode: "save" | "rename") {
    setSearchError(null)
    setNameDraft(mode === "rename" ? activeSearch?.name ?? "" : "")
    setNaming(mode)
  }
  function commitName() {
    const name = nameDraft.trim()
    if (!name) return setSearchError("Please name the search.")
    startSearchTransition(async () => {
      const res =
        naming === "rename" && activeSearchId
          ? await updateContactSearch(activeSearchId, { name })
          : await saveContactSearch(name, advQuery)
      if (!res.ok) return setSearchError(res.error)
      if ("id" in res) setActiveSearchId((res as { id: string }).id)
      setNaming(null)
      router.refresh()
    })
  }
  function updateCurrent() {
    if (!activeSearchId) return
    setSearchError(null)
    startSearchTransition(async () => {
      const res = await updateContactSearch(activeSearchId, { query: advQuery })
      if (!res.ok) return setSearchError(res.error)
      router.refresh()
    })
  }
  function deleteCurrent() {
    if (!activeSearchId) return
    startSearchTransition(async () => {
      const res = await deleteContactSearch(activeSearchId)
      setConfirmDeleteSearch(false)
      if (!res.ok) return setSearchError(res.error)
      clearSearch()
      router.refresh()
    })
  }

  const searchTypeFiltered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return contacts.filter((c) => {
      // Multi-select: match a contact that has ANY of the selected tags.
      if (typeFilter.size > 0 && !c.types.some((t) => typeFilter.has(t))) return false
      // Advanced builder (no-op when there are no active conditions).
      if (!matchContact(c, advQuery)) return false
      if (!q) return true
      const hay = [
        fullName(c),
        c.addresses.map(addressText).join(" "),
        c.emails.map((e) => e.email).join(" "),
        c.phones.map((p) => p.phone).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [contacts, query, typeFilter, advQuery])

  // Distinct last-name initials present in the current search/type context, for the A–Z bar.
  const letters = useMemo(() => {
    const set = new Set<string>()
    for (const c of searchTypeFiltered) set.add(lastInitial(c))
    return [...set].sort() // "#" sorts before letters
  }, [searchTypeFiltered])

  const filtered = useMemo(
    () => (letter ? searchTypeFiltered.filter((c) => lastInitial(c) === letter) : searchTypeFiltered),
    [searchTypeFiltered, letter],
  )

  // Always sorted by last name (then first). Blank names sort last.
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = sortValue(a)
      const bv = sortValue(b)
      if (!av && !bv) return 0
      if (!av) return 1
      if (!bv) return -1
      return av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" })
    })
  }, [filtered])

  // Pagination (clamp the page so filter changes never leave it out of range).
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paged = useMemo(
    () => sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sorted, currentPage, pageSize],
  )

  // Reset to the first page whenever the result set or page size changes.
  useEffect(() => {
    setPage(1)
  }, [query, typeFilter, letter, pageSize, advQuery])

  // Per-tag counts for the filter chips.
  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of contacts) for (const t of c.types) m[t] = (m[t] ?? 0) + 1
    return m
  }, [contacts])

  const tagMap = useMemo(() => buildTagMap(tags), [tags])

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
        <div className="flex items-center gap-2">
          {canImport && (
            <Link
              href="/contacts/import"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-[#1b3a6b] transition-colors hover:bg-muted"
            >
              <Upload className="h-4 w-4" />
              Load list
            </Link>
          )}
          {canImportDonors && (
            <Link
              href="/contacts/import-donors"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-[#1b3a6b] transition-colors hover:bg-muted"
            >
              <HandCoins className="h-4 w-4" />
              Import donors
            </Link>
          )}
          <Button onClick={() => setEditing("new")}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add contact
          </Button>
        </div>
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

      {duplicateGroups > 0 && (
        <Link
          href="/contacts/duplicates"
          className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#1b3a6b]/25 bg-[#1b3a6b]/5 px-4 py-3 transition-colors hover:bg-[#1b3a6b]/10"
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[#1b3a6b]">
            <Users className="h-4 w-4" />
            {duplicateGroups} possible duplicate {duplicateGroups === 1 ? "group" : "groups"} found
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#1b3a6b]">
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
                placeholder="Search name, email, phone…"
                className="w-full rounded-lg border border-border bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"
              />
            </div>
            <button
              onClick={() => setAdvOpen((o) => !o)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2.5 text-sm font-medium transition-colors ${
                advOpen || advCount > 0
                  ? "border-[#1b3a6b] bg-[#1b3a6b]/5 text-[#1b3a6b]"
                  : "border-border text-[#1a1a2e] hover:bg-muted"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Advanced
              {advCount > 0 && (
                <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1b3a6b] px-1.5 text-xs font-semibold text-white">
                  {advCount}
                </span>
              )}
            </button>
            <ContactListActions contacts={sorted} tags={tags} canDelete={canDelete} canTag={canTag} />
          </div>

          {/* Advanced search builder */}
          {advOpen && (
            <div className="mt-3 rounded-2xl border border-border bg-muted/30 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-[#1a1a2e]">Advanced search</h3>
                  <p className="text-xs text-muted-foreground">
                    Contacts match if they satisfy any group; within a group, all conditions must match.
                  </p>
                </div>
                {/* Saved-search toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  {savedSearches.length > 0 && (
                    <select
                      value={activeSearchId}
                      onChange={(e) => loadSearch(e.target.value)}
                      className="rounded-md border border-border bg-white px-2 py-1.5 text-sm text-[#1a1a2e] outline-none focus:border-[#1b3a6b]"
                    >
                      <option value="">Saved searches…</option>
                      {savedSearches.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {activeSearch ? (
                    <>
                      <button
                        onClick={updateCurrent}
                        disabled={searchPending}
                        className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-[#1b3a6b] transition-colors hover:bg-muted disabled:opacity-50"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => startNaming("save")}
                        className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-[#1a1a2e]"
                      >
                        Save as new
                      </button>
                      <button
                        onClick={() => startNaming("rename")}
                        className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-[#1a1a2e]"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => setConfirmDeleteSearch(true)}
                        className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-red-600"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    advCount > 0 && (
                      <button
                        onClick={() => startNaming("save")}
                        className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-[#1b3a6b] transition-colors hover:bg-muted"
                      >
                        Save as…
                      </button>
                    )
                  )}
                  {advCount > 0 && (
                    <button
                      onClick={clearSearch}
                      className="text-sm font-medium text-muted-foreground transition-colors hover:text-[#1a1a2e]"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {naming && (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-3">
                  <input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && commitName()}
                    placeholder="Search name"
                    className="min-w-[12rem] flex-1 rounded-md border border-border bg-white px-2 py-1.5 text-sm outline-none focus:border-[#1b3a6b]"
                  />
                  <Button onClick={commitName} disabled={searchPending}>
                    {searchPending ? "Saving…" : naming === "rename" ? "Rename" : "Save"}
                  </Button>
                  <button
                    onClick={() => setNaming(null)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e]"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {searchError && (
                <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {searchError}
                </p>
              )}

              <ContactSearchBuilder
                query={advQuery}
                onChange={setAdvQuery}
                tagOptions={tags.map((t) => ({ value: t.slug, label: t.label }))}
              />
            </div>
          )}

          {confirmDeleteSearch && activeSearch && (
            <ConfirmDialog
              title="Delete saved search"
              message={
                <>
                  Delete <strong className="font-medium text-[#1a1a2e]">{activeSearch.name}</strong>? This removes it
                  for everyone in the committee.
                </>
              }
              confirmLabel={searchPending ? "Deleting…" : "Delete"}
              pending={searchPending}
              onCancel={() => setConfirmDeleteSearch(false)}
              onConfirm={deleteCurrent}
            />
          )}

          {/* Tag filter chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip label="All" count={contacts.length} active={typeFilter.size === 0} onClick={() => setTypeFilter(new Set())} />
            {tags
              .filter((t) => counts[t.slug])
              .map((t) => (
                <Chip
                  key={t.slug}
                  label={t.label}
                  count={counts[t.slug]}
                  active={typeFilter.has(t.slug)}
                  onClick={() => toggleTypeFilter(t.slug)}
                />
              ))}
          </div>

          {/* Alphabetic quick filter (by last-name initial) */}
          {letters.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-1">
              <LetterChip label="All" active={letter === null} onClick={() => setLetter(null)} />
              {letters.map((L) => (
                <LetterChip key={L} label={L} active={letter === L} onClick={() => setLetter(L)} />
              ))}
            </div>
          )}

          {/* Table */}
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-white">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Address</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {paged.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3 align-top">
                      <Link
                        href={`/contacts/${c.id}`}
                        className="font-medium text-[#1b3a6b] underline underline-offset-2 decoration-[#1b3a6b]/40 transition-colors hover:decoration-[#1b3a6b]"
                      >
                        {nameLastFirst(c)}
                      </Link>
                      {c.types.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.types.map((t) => {
                            const def = tagMap.get(t)
                            return (
                              <span
                                key={t}
                                className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium"
                                style={tagBadgeStyle(def?.color ?? "#6b7280")}
                              >
                                {def?.label ?? t}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground">
                      <MethodCell
                        primary={c.emails[0] ? { value: c.emails[0].email, label: c.emails[0].label, href: `mailto:${c.emails[0].email}` } : null}
                        extra={c.emails.length - 1}
                      />
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground">
                      <MethodCell
                        primary={c.phones[0] ? { value: formatPhone(c.phones[0].phone), label: c.phones[0].label, href: `tel:${c.phones[0].phone}` } : null}
                        extra={c.phones.length - 1}
                      />
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground">
                      <AddressCell address={c.addresses[0] ?? null} />
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
            {sorted.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No contacts match your search.
              </p>
            )}
          </div>

          {/* Pagination */}
          {sorted.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sorted.length)} of{" "}
                {sorted.length}
              </span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5">
                  Per page
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="rounded-md border border-border bg-white px-2 py-1 text-sm text-[#1a1a2e] outline-none focus:border-[#1b3a6b]"
                  >
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="rounded-md border border-border p-1.5 transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-1 tabular-nums">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="rounded-md border border-border p-1.5 transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {editing && (
        <ContactDialog
          contact={editing === "new" ? null : editing}
          tags={tags}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function AddressCell({ address }: { address: ContactAddress | null }) {
  if (!address) return <>—</>
  const street = [address.line1, address.line2].filter(Boolean).join(", ")
  const cityStateZip = [[address.city, address.state].filter(Boolean).join(", "), address.zip]
    .filter(Boolean)
    .join(" ")
  if (!street && !cityStateZip) return <>—</>
  return (
    <div className="leading-snug">
      {street && <div>{street}</div>}
      {cityStateZip && <div>{cityStateZip}</div>}
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

function LetterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 text-xs font-semibold transition-colors ${
        active
          ? "border-[#1b3a6b] bg-[#1b3a6b] text-white"
          : "border-border bg-white text-muted-foreground hover:border-[#1b3a6b]/40 hover:text-[#1b3a6b]"
      }`}
    >
      {label}
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

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
}: {
  title: string
  message: React.ReactNode
  confirmLabel: string
  pending?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="px-6 pt-5">
          <h2 className="text-lg font-semibold text-[#1a1a2e]">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="mt-5 flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteContact(id)
      setConfirming(false)
    })
  }

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
        aria-label="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      {confirming && (
        <ConfirmDialog
          title="Delete contact"
          message={
            <>
              Delete <strong className="font-medium text-[#1a1a2e]">{name || "this contact"}</strong>? This
              can&rsquo;t be undone.
            </>
          }
          confirmLabel={isPending ? "Deleting…" : "Delete"}
          pending={isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={handleDelete}
        />
      )}
    </>
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
  tags,
  onClose,
}: {
  contact: ContactRow | null
  tags: TagDef[]
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

          {/* Tags */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-[#1a1a2e]">Tags</span>
              <Link href="/contacts/tags" className="text-xs font-medium text-[#1b3a6b] hover:underline" onClick={onClose}>
                Manage tags
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => {
                const active = types.includes(t.slug)
                return (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => toggleType(t.slug)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      active ? "" : "border-border bg-white text-muted-foreground hover:border-[#1b3a6b]/40"
                    }`}
                    style={active ? { backgroundColor: t.color, borderColor: t.color, color: "#fff" } : undefined}
                  >
                    {t.label}
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

function LabelSelect({
  value,
  options,
  onChange,
  className,
}: {
  value: string
  options: readonly string[]
  onChange: (v: string) => void
  className?: string
}) {
  // Preserve a legacy value not in the current vocabulary so it still displays.
  const opts = !value || options.includes(value) ? options : [value, ...options]
  return (
    <select value={value || options[0]} onChange={(e) => onChange(e.target.value)} className={className}>
      {opts.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
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
  labelList: readonly string[]
  valuePlaceholder: string
  valueType: string
  addLabel: string
  defaultLabel: string
}) {
  function update(key: string, patch: Partial<MethodRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }
  function remove(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key))
  }
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">{title}</span>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.key} className="flex gap-2">
            <LabelSelect
              value={r.label}
              options={labelList}
              onChange={(label) => update(r.key, { label })}
              className={`${fieldBase} w-32 shrink-0`}
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

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.key} className="rounded-xl border border-border p-3">
            <div className="flex items-center gap-2">
              <LabelSelect
                value={r.label}
                options={ADDRESS_LABELS}
                onChange={(label) => update(r.key, { label })}
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
