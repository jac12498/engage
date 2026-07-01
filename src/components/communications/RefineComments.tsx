"use client"

import { useState } from "react"
import { Wand2, Loader2, Trash2, TextQuote, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { inputCls } from "./shared"

type Comment = { quote: string | null; text: string }

/**
 * Collects comments / critiques / suggestions to guide a revision. Each comment
 * can optionally target a passage the user selected in the draft. On "Revise" it
 * composes them into a single instruction string and hands it to the parent
 * (which owns the streaming revise call).
 */
export function RefineComments({
  getSelection,
  onSubmit,
  busy,
}: {
  getSelection: () => string
  onSubmit: (notes: string) => void
  busy: boolean
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState("")
  const [pendingQuote, setPendingQuote] = useState<string | null>(null)

  function commentOnSelection() {
    const sel = getSelection().trim()
    if (sel) setPendingQuote(sel.length > 300 ? sel.slice(0, 300) + "…" : sel)
  }

  function addComment() {
    const t = text.trim()
    if (!t) return
    setComments((cs) => [...cs, { quote: pendingQuote, text: t }])
    setText("")
    setPendingQuote(null)
  }

  function submit() {
    const all = [...comments]
    const t = text.trim()
    if (t) all.push({ quote: pendingQuote, text: t })
    if (all.length === 0) return
    const notes = all
      .map((c) => (c.quote ? `Regarding "${c.quote}": ${c.text}` : c.text))
      .join("\n")
    setComments([])
    setText("")
    setPendingQuote(null)
    onSubmit(notes)
  }

  const canSubmit = comments.length > 0 || text.trim().length > 0

  return (
    <div className="mt-3 rounded-lg border border-border bg-[#f4f6f9] p-3">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c4910a]">
        Comments &amp; suggestions
      </label>

      {comments.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {comments.map((c, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-md border border-border bg-white p-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                {c.quote && (
                  <p className="truncate text-xs italic text-muted-foreground">“{c.quote}”</p>
                )}
                <p className="text-[#1a1a2e]">{c.text}</p>
              </div>
              <button
                onClick={() => setComments((cs) => cs.filter((_, idx) => idx !== i))}
                className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                aria-label="Remove comment"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pendingQuote && (
        <div className="mb-1.5 flex items-start gap-1.5 rounded-md bg-[#1b3a6b]/5 px-2 py-1 text-xs text-[#1b3a6b]">
          <TextQuote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate italic">“{pendingQuote}”</span>
          <button onClick={() => setPendingQuote(null)} aria-label="Clear selection">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Add a comment, critique, or suggestion…"
        className={inputCls}
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={commentOnSelection}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#1b3a6b] hover:underline"
          >
            <TextQuote className="h-3.5 w-3.5" /> Comment on selection
          </button>
          <button
            type="button"
            onClick={addComment}
            disabled={!text.trim()}
            className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-[#1a1a2e] disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        <Button variant="outline" onClick={submit} disabled={busy || !canSubmit}>
          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1.5 h-4 w-4" />}
          {busy ? "Revising…" : "Revise"}
        </Button>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Select text in the draft, then “Comment on selection” to target a passage. Your edits are kept.
      </p>
    </div>
  )
}
