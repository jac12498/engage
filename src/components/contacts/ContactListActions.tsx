"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Download, Printer, Phone, Mail, Copy, Check, ChevronDown, ChevronRight, ListChecks, Tag, Trash2, X } from "lucide-react"
import { toCsv, labelsHtml, phoneListHtml, emailListEntries, mailingAddress, LABEL_FORMATS, type ExportContact } from "@/lib/contactExport"
import { bulkDeleteContacts, bulkUpdateTags } from "@/app/contacts/actions"
import { type TagDef } from "@/lib/tags"
import { type ContactFieldDef } from "@/lib/contactFields"
import Link from "next/link"

/** Actions that operate on the current (filtered) list of contacts. */
export function ContactListActions({
  contacts,
  tags,
  fields = [],
  canDelete = false,
  canTag = false,
}: {
  contacts: ExportContact[]
  tags: TagDef[]
  fields?: ContactFieldDef[]
  canDelete?: boolean
  canTag?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [labelsOpen, setLabelsOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [deleting, startDelete] = useTransition()
  // Email-list modal state.
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailAll, setEmailAll] = useState(false)
  const [emailSep, setEmailSep] = useState<", " | "; ">(", ")
  const [emailNames, setEmailNames] = useState(false)
  const [copied, setCopied] = useState(false)
  // Bulk-tag modal state.
  const [tagOpen, setTagOpen] = useState(false)
  const [addTags, setAddTags] = useState<Set<string>>(new Set())
  const [removeTags, setRemoveTags] = useState<Set<string>>(new Set())
  const [tagError, setTagError] = useState<string | null>(null)
  const [tagging, startTag] = useTransition()
  const n = contacts.length
  const withAddress = contacts.filter((c) => mailingAddress(c)).length
  const withPhone = contacts.filter((c) => c.phones.length > 0).length
  const withEmail = contacts.filter((c) => c.emails.length > 0).length

  const emailEntries = useMemo(
    () => (emailOpen ? emailListEntries(contacts, { all: emailAll, withName: emailNames }) : []),
    [emailOpen, contacts, emailAll, emailNames],
  )
  const emailText = emailEntries.join(emailSep)

  function close() {
    setOpen(false)
    setLabelsOpen(false)
  }

  function exportCsv() {
    close()
    const tagLabels = Object.fromEntries(tags.map((t) => [t.slug, t.label]))
    const blob = new Blob([toCsv(contacts, tagLabels, fields)], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function printDoc(html: string) {
    close()
    const w = window.open("", "_blank")
    if (!w) {
      alert("Please allow pop-ups for this site to print.")
      return
    }
    w.document.write(html)
    w.document.close()
  }

  function openEmailList() {
    close()
    setCopied(false)
    setEmailOpen(true)
  }
  async function copyEmails() {
    try {
      await navigator.clipboard.writeText(emailText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  function openTags() {
    close()
    setAddTags(new Set())
    setRemoveTags(new Set())
    setTagError(null)
    setTagOpen(true)
  }
  function toggleAdd(t: string) {
    setAddTags((prev) => {
      const next = new Set(prev)
      next.has(t) ? next.delete(t) : next.add(t)
      return next
    })
    setRemoveTags((prev) => {
      if (!prev.has(t)) return prev
      const next = new Set(prev)
      next.delete(t)
      return next
    })
  }
  function toggleRemove(t: string) {
    setRemoveTags((prev) => {
      const next = new Set(prev)
      next.has(t) ? next.delete(t) : next.add(t)
      return next
    })
    setAddTags((prev) => {
      if (!prev.has(t)) return prev
      const next = new Set(prev)
      next.delete(t)
      return next
    })
  }
  function applyTags() {
    setTagError(null)
    startTag(async () => {
      const res = await bulkUpdateTags(contacts.map((c) => c.id), [...addTags], [...removeTags])
      if (!res.ok) return setTagError(res.error ?? "Couldn't update tags.")
      setTagOpen(false)
      router.refresh()
    })
  }

  function openDelete() {
    close()
    setConfirmText("")
    setError(null)
    setConfirming(true)
  }
  function doDelete() {
    startDelete(async () => {
      const res = await bulkDeleteContacts(contacts.map((c) => c.id))
      if (!res.ok) return setError(res.error ?? "Couldn't delete.")
      setConfirming(false)
      router.refresh()
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={n === 0}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2.5 text-sm font-medium text-[#1a1a2e] transition-colors hover:bg-muted disabled:opacity-50"
      >
        <ListChecks className="h-4 w-4" />
        List actions
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={close} />
          <div className="absolute right-0 z-40 mt-1 w-72 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-lg">
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Acts on the {n} {n === 1 ? "contact" : "contacts"} in the current list.
            </div>
            <MenuItem icon={Download} label="Export to CSV" hint={`${n} ${n === 1 ? "contact" : "contacts"}`} onClick={exportCsv} />
            <MenuItem icon={Mail} label="Email list (copy)" hint={`${withEmail} with an email`} disabled={withEmail === 0} onClick={openEmailList} />
            <button
              onClick={() => setLabelsOpen((v) => !v)}
              disabled={withAddress === 0}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#1a1a2e] transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <Printer className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1">Print address labels</span>
              <span className="text-xs text-muted-foreground">{withAddress}</span>
              {labelsOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
            {labelsOpen && withAddress > 0 && (
              <div className="border-y border-border/60 bg-muted/30 py-0.5">
                {LABEL_FORMATS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => printDoc(labelsHtml(contacts, f.id))}
                    className="flex w-full items-center gap-2 py-1.5 pl-10 pr-3 text-left text-sm text-[#1a1a2e] transition-colors hover:bg-muted"
                  >
                    <span className="flex-1">{f.name}</span>
                    <span className="text-xs text-muted-foreground">{f.per}/sheet</span>
                  </button>
                ))}
              </div>
            )}
            <MenuItem
              icon={Phone}
              label="Print phone list"
              hint={`${withPhone} with a phone`}
              disabled={withPhone === 0}
              onClick={() => printDoc(phoneListHtml(contacts))}
            />
            {canTag && (
              <>
                <div className="my-1 border-t border-border" />
                <MenuItem icon={Tag} label="Add or remove tags…" hint={`${n}`} onClick={openTags} />
              </>
            )}
            {canDelete && (
              <>
                <div className="my-1 border-t border-border" />
                <MenuItem icon={Trash2} label="Delete these contacts…" hint={`${n}`} danger onClick={openDelete} />
              </>
            )}
          </div>
        </>
      )}

      {tagOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !tagging && setTagOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-[#1a1a2e]">Add or remove tags</h2>
              <button onClick={() => setTagOpen(false)} disabled={tagging} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-[#1a1a2e]" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <p className="text-sm text-muted-foreground">
                Applies to the <strong className="font-medium text-[#1a1a2e]">{n}</strong> {n === 1 ? "contact" : "contacts"} in the current list.
              </p>
              <div>
                <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">Add these tags</span>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => {
                    const active = addTags.has(t.slug)
                    return (
                      <button
                        key={t.slug}
                        onClick={() => toggleAdd(t.slug)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          active ? "border-[#1e6b3a] bg-[#1e6b3a] text-white" : "border-border bg-white text-muted-foreground hover:border-[#1e6b3a]/40"
                        }`}
                      >
                        {active ? "+ " : ""}
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">Remove these tags</span>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => {
                    const active = removeTags.has(t.slug)
                    return (
                      <button
                        key={t.slug}
                        onClick={() => toggleRemove(t.slug)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          active ? "border-red-600 bg-red-600 text-white" : "border-border bg-white text-muted-foreground hover:border-red-400"
                        }`}
                      >
                        {active ? "− " : ""}
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <Link href="/contacts/tags" className="inline-block text-xs font-medium text-[#1b3a6b] hover:underline">
                Manage tags
              </Link>
              {tagError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{tagError}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <button onClick={() => setTagOpen(false)} disabled={tagging} className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e] disabled:opacity-50">
                Cancel
              </button>
              <button
                onClick={applyTags}
                disabled={tagging || (addTags.size === 0 && removeTags.size === 0)}
                className="rounded-lg bg-[#1b3a6b] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#16305a] disabled:opacity-40"
              >
                {tagging ? "Applying…" : `Apply to ${n}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {emailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEmailOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-[#1a1a2e]">Email list</h2>
              <button onClick={() => setEmailOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-[#1a1a2e]" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 px-6 py-5">
              <p className="text-sm text-muted-foreground">
                {withEmail} {withEmail === 1 ? "contact" : "contacts"} with an email ·{" "}
                <strong className="font-medium text-[#1a1a2e]">{emailEntries.length}</strong> unique{" "}
                {emailEntries.length === 1 ? "address" : "addresses"}.
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <label className="inline-flex items-center gap-1.5">
                  <input type="checkbox" checked={emailAll} onChange={(e) => setEmailAll(e.target.checked)} className="accent-[#1b3a6b]" />
                  All emails (not just one per contact)
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input type="checkbox" checked={emailNames} onChange={(e) => setEmailNames(e.target.checked)} className="accent-[#1b3a6b]" />
                  Include names
                </label>
                <span className="inline-flex items-center gap-1.5">
                  Separator:
                  <button
                    onClick={() => setEmailSep(", ")}
                    className={`rounded-md border px-2 py-1 text-xs font-medium ${emailSep === ", " ? "border-[#1b3a6b] bg-[#1b3a6b] text-white" : "border-border text-muted-foreground hover:border-[#1b3a6b]/40"}`}
                  >
                    , comma
                  </button>
                  <button
                    onClick={() => setEmailSep("; ")}
                    className={`rounded-md border px-2 py-1 text-xs font-medium ${emailSep === "; " ? "border-[#1b3a6b] bg-[#1b3a6b] text-white" : "border-border text-muted-foreground hover:border-[#1b3a6b]/40"}`}
                  >
                    ; semicolon
                  </button>
                </span>
              </div>
              <textarea
                readOnly
                value={emailText}
                rows={7}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full resize-y rounded-lg border border-border bg-muted/30 px-3 py-2 font-mono text-xs text-[#1a1a2e] outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <button onClick={() => setEmailOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e]">
                Close
              </button>
              <button
                onClick={copyEmails}
                disabled={emailEntries.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1b3a6b] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#16305a] disabled:opacity-50"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copy {emailEntries.length} {emailEntries.length === 1 ? "address" : "addresses"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !deleting && setConfirming(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-[#1a1a2e]">Delete {n} {n === 1 ? "contact" : "contacts"}?</h2>
              <button onClick={() => setConfirming(false)} disabled={deleting} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-[#1a1a2e]" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 px-6 py-5">
              <p className="text-sm text-muted-foreground">
                This permanently deletes the <strong className="font-medium text-[#1a1a2e]">{n}</strong>{" "}
                {n === 1 ? "contact" : "contacts"} in the current list, along with their emails, phones, addresses, notes,
                and donations. This <strong className="font-medium text-red-600">can&rsquo;t be undone</strong>.
              </p>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-[#1a1a2e]">
                  Type <span className="font-mono text-red-600">delete</span> to confirm
                </span>
                <input
                  autoFocus
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmText.trim().toLowerCase() === "delete" && !deleting && doDelete()}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
                />
              </label>
              {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <button onClick={() => setConfirming(false)} disabled={deleting} className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e] disabled:opacity-50">
                Cancel
              </button>
              <button
                onClick={doDelete}
                disabled={deleting || confirmText.trim().toLowerCase() !== "delete"}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
              >
                {deleting ? "Deleting…" : `Delete ${n}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({
  icon: Icon,
  label,
  hint,
  disabled,
  danger,
  onClick,
}: {
  icon: typeof Download
  label: string
  hint?: string
  disabled?: boolean
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${
        danger ? "text-red-600 hover:bg-red-50" : "text-[#1a1a2e] hover:bg-muted"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${danger ? "text-red-600" : "text-muted-foreground"}`} />
      <span className="flex-1">{label}</span>
      {hint && <span className={`text-xs ${danger ? "text-red-400" : "text-muted-foreground"}`}>{hint}</span>}
    </button>
  )
}
