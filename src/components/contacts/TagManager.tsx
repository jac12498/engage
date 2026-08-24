"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Pencil, Trash2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DEFAULT_TAGS, TAG_COLORS, tagBadgeStyle } from "@/lib/tags"
import { createTag, updateTag, deleteTag } from "@/app/contacts/tags/actions"

interface CustomTag {
  id: string
  slug: string
  label: string
  color: string
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium" style={tagBadgeStyle(color)}>
      {label}
    </span>
  )
}

function Swatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TAG_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`h-6 w-6 rounded-full ring-2 ${value === c ? "ring-[#1a1a2e]" : "ring-transparent"}`}
          style={{ backgroundColor: c }}
          aria-label={`Color ${c}`}
        />
      ))}
    </div>
  )
}

export function TagManager({ customTags }: { customTags: CustomTag[] }) {
  const router = useRouter()
  const [addLabel, setAddLabel] = useState("")
  const [addColor, setAddColor] = useState(TAG_COLORS[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState("")
  const [editColor, setEditColor] = useState(TAG_COLORS[0])
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function add() {
    if (!addLabel.trim()) return setError("Please name the tag.")
    setError(null)
    start(async () => {
      const res = await createTag(addLabel, addColor)
      if (!res.ok) return setError(res.error)
      setAddLabel("")
      setAddColor(TAG_COLORS[0])
      router.refresh()
    })
  }
  function beginEdit(t: CustomTag) {
    setEditingId(t.id)
    setEditLabel(t.label)
    setEditColor(TAG_COLORS.includes(t.color) ? t.color : TAG_COLORS[0])
    setError(null)
  }
  function saveEdit(id: string) {
    setError(null)
    start(async () => {
      const res = await updateTag(id, { label: editLabel, color: editColor })
      if (!res.ok) return setError(res.error)
      setEditingId(null)
      router.refresh()
    })
  }
  function remove(t: CustomTag) {
    if (!confirm(`Delete the "${t.label}" tag? It will be removed from all contacts.`)) return
    setError(null)
    start(async () => {
      const res = await deleteTag(t.id)
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
      <h1 className="mt-3 text-2xl font-bold text-[#1a1a2e]">Contact tags</h1>
      <p className="mt-1 text-muted-foreground">
        Tags help you group contacts. The built-in tags are always available; add your own below.
      </p>

      {error && <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}

      {/* Built-in */}
      <div className="mt-6 rounded-2xl border border-border bg-white p-5">
        <h2 className="text-sm font-semibold text-[#1a1a2e]">Built-in tags</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Always available; can&rsquo;t be changed.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DEFAULT_TAGS.map((t) => (
            <Badge key={t.slug} label={t.label} color={t.color} />
          ))}
        </div>
      </div>

      {/* Custom */}
      <div className="mt-4 rounded-2xl border border-border bg-white p-5">
        <h2 className="text-sm font-semibold text-[#1a1a2e]">Your tags</h2>
        {customTags.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">No custom tags yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border/60">
            {customTags.map((t) => (
              <li key={t.id} className="py-3">
                {editingId === t.id ? (
                  <div className="space-y-2.5">
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="w-full max-w-xs rounded-lg border border-border bg-white px-3 py-1.5 text-sm outline-none focus:border-[#1b3a6b]"
                    />
                    <Swatches value={editColor} onChange={setEditColor} />
                    <div className="flex items-center gap-2">
                      <Button onClick={() => saveEdit(t.id)} disabled={pending}>
                        <Check className="mr-1 h-4 w-4" />
                        Save
                      </Button>
                      <button onClick={() => setEditingId(null)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e]">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <Badge label={t.label} color={t.color} />
                    <div className="flex items-center gap-1">
                      <button onClick={() => beginEdit(t)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-[#1b3a6b]" aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(t)} disabled={pending} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50" aria-label="Delete">
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
        <div className="mt-4 rounded-xl border border-dashed border-border p-4">
          <span className="mb-2 block text-sm font-medium text-[#1a1a2e]">Add a tag</span>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Tag name (e.g. Board Member)"
              className="min-w-[12rem] flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-[#1b3a6b]"
            />
            {addLabel.trim() && <Badge label={addLabel.trim()} color={addColor} />}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <Swatches value={addColor} onChange={setAddColor} />
            <Button onClick={add} disabled={pending || !addLabel.trim()}>
              <Plus className="mr-1 h-4 w-4" />
              Add tag
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
