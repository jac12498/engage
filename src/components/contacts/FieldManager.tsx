"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Pencil, Trash2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  FIELD_TYPES,
  FIELD_TYPE_LABELS,
  fieldNeedsOptions,
  type ContactFieldDef,
  type ContactFieldType,
} from "@/lib/contactFields"
import { createField, updateField, deleteField } from "@/app/contacts/fields/actions"

const inputCls = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-[#1b3a6b]"

/** Comma-separated choices editor for select / multiselect. */
function OptionsInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">Choices (one per line)</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} className={`${inputCls} resize-y`} placeholder={"Kingston\nWoodstock\nSaugerties"} />
    </label>
  )
}

const parseOptions = (s: string) => s.split(/\n/).map((x) => x.trim()).filter(Boolean)

export function FieldManager({ fields }: { fields: ContactFieldDef[] }) {
  const router = useRouter()
  const [addLabel, setAddLabel] = useState("")
  const [addType, setAddType] = useState<ContactFieldType>("text")
  const [addOptions, setAddOptions] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState("")
  const [editOptions, setEditOptions] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function add() {
    if (!addLabel.trim()) return setError("Please name the field.")
    setError(null)
    start(async () => {
      const res = await createField(addLabel, addType, parseOptions(addOptions))
      if (!res.ok) return setError(res.error)
      setAddLabel("")
      setAddType("text")
      setAddOptions("")
      router.refresh()
    })
  }
  function beginEdit(f: ContactFieldDef) {
    setEditingId(f.id)
    setEditLabel(f.label)
    setEditOptions(f.options.join("\n"))
    setError(null)
  }
  function saveEdit(f: ContactFieldDef) {
    setError(null)
    start(async () => {
      const res = await updateField(f.id, {
        label: editLabel,
        ...(fieldNeedsOptions(f.type) ? { options: parseOptions(editOptions) } : {}),
      })
      if (!res.ok) return setError(res.error)
      setEditingId(null)
      router.refresh()
    })
  }
  function remove(f: ContactFieldDef) {
    if (!confirm(`Delete the "${f.label}" field? Its values will be removed from all contacts.`)) return
    setError(null)
    start(async () => {
      const res = await deleteField(f.id)
      if (!res.ok) return setError(res.error)
      router.refresh()
    })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/contacts" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-[#1a1a2e]">
        <ArrowLeft className="h-4 w-4" />
        Contacts
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-[#1a1a2e]">Contact fields</h1>
      <p className="mt-1 text-muted-foreground">
        Add your own fields to every contact — like &ldquo;Municipal Committee&rdquo; or &ldquo;Election District&rdquo;. They
        appear on the contact form and can be searched.
      </p>

      {error && <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}

      <div className="mt-6 rounded-2xl border border-border bg-white p-5">
        <h2 className="text-sm font-semibold text-[#1a1a2e]">Your fields</h2>
        {fields.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">No custom fields yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border/60">
            {fields.map((f) => (
              <li key={f.id} className="py-3">
                {editingId === f.id ? (
                  <div className="space-y-2.5">
                    <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className={inputCls} />
                    {fieldNeedsOptions(f.type) && <OptionsInput value={editOptions} onChange={setEditOptions} />}
                    <div className="flex items-center gap-2">
                      <Button onClick={() => saveEdit(f)} disabled={pending}>
                        <Check className="mr-1 h-4 w-4" />
                        Save
                      </Button>
                      <button onClick={() => setEditingId(null)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e]">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-[#1a1a2e]">{f.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {FIELD_TYPE_LABELS[f.type]}
                        {f.options.length > 0 && ` · ${f.options.join(", ")}`}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => beginEdit(f)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-[#1b3a6b]" aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(f)} disabled={pending} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Add */}
        <div className="mt-4 space-y-3 rounded-xl border border-dashed border-border p-4">
          <span className="block text-sm font-medium text-[#1a1a2e]">Add a field</span>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Name</span>
              <input value={addLabel} onChange={(e) => setAddLabel(e.target.value)} placeholder="Election District" className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Type</span>
              <select value={addType} onChange={(e) => setAddType(e.target.value as ContactFieldType)} className={inputCls}>
                {FIELD_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {fieldNeedsOptions(addType) && <OptionsInput value={addOptions} onChange={setAddOptions} />}
          <div className="flex justify-end">
            <Button onClick={add} disabled={pending || !addLabel.trim()}>
              <Plus className="mr-1 h-4 w-4" />
              Add field
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
