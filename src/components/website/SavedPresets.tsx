"use client"

import { useState, useTransition } from "react"
import { Trash2, Loader2 } from "lucide-react"
import { deletePreset } from "@/app/newsletters/actions"

export function SavedPresets({ presets }: { presets: { id: string; name: string }[] }) {
  const [items, setItems] = useState(presets)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [, start] = useTransition()

  function remove(id: string) {
    if (!confirm("Delete this template? Newsletters already created from it aren't affected.")) return
    setBusyId(id)
    start(async () => {
      const res = await deletePreset(id)
      if (res.ok) setItems((prev) => prev.filter((p) => p.id !== id))
      setBusyId(null)
    })
  }

  if (items.length === 0) return null

  return (
    <section className="mt-6 rounded-2xl border border-border bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Saved templates</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Full presets (branding + layout) saved from an issue. Start a new newsletter from one on the Newsletters page.
      </p>
      <div className="mt-3 space-y-2">
        {items.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <span className="text-sm font-medium text-[#1a1a2e]">{p.name}</span>
            <button
              onClick={() => remove(p.id)}
              disabled={busyId === p.id}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              aria-label={`Delete ${p.name}`}
            >
              {busyId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
