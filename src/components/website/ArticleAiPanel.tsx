"use client"

import { useRef, useState } from "react"
import { Loader2, Sparkles, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RefineComments } from "@/components/communications/RefineComments"
import { SELECTABLE_AI_MODELS } from "@/lib/entitlements"
import { parseArticleProse } from "@/lib/newsletter/articleDraft"

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"

/**
 * Inline AI authoring for a single newsletter article. Reuses the Communications
 * engine: streams from /api/communications/generate (create) and /revise (refine).
 * The draft is plain prose (headline line + body) that the user can hand-edit; on
 * accept it's parsed back to { title, body } for the parent to map to blocks.
 *
 * - mode "create": start from an instruction → Generate → refine → Insert.
 * - mode "assist": start seeded from the article's current prose → refine → Apply.
 */
export function ArticleAiPanel({
  mode,
  defaultModel,
  initialDraft = "",
  onAccept,
  onClose,
}: {
  mode: "create" | "assist"
  defaultModel: string
  initialDraft?: string
  onAccept: (title: string, body: string) => void
  onClose?: () => void
}) {
  const [model, setModel] = useState(defaultModel)
  const [instruction, setInstruction] = useState("")
  const [draft, setDraft] = useState(initialDraft)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const draftRef = useRef<HTMLTextAreaElement>(null)

  async function stream(url: string, payload: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.status === 429) {
        setError("You're out of Model Credits this month.")
        return
      }
      if (!res.ok || !res.body) {
        setError((await res.text().catch(() => "")) || "Generation failed. Please try again.")
        return
      }
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let acc = ""
      setDraft("")
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        acc += dec.decode(value, { stream: true })
        setDraft(acc)
      }
    } catch {
      setError("Generation failed. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  function generate() {
    const t = instruction.trim()
    if (!t) return
    stream("/api/communications/generate", { type: "newsletter_article", newsHook: t, model })
  }
  function revise(notes: string) {
    if (!draft.trim()) return
    stream("/api/communications/revise", { type: "newsletter_article", currentDraft: draft, notes, model })
  }
  function accept() {
    const { title, body } = parseArticleProse(draft)
    if (!title && !body.trim()) return
    onAccept(title, body)
    if (mode === "create") {
      setDraft("")
      setInstruction("")
    }
  }

  const getSelection = () => {
    const el = draftRef.current
    return el ? el.value.slice(el.selectionStart, el.selectionEnd) : ""
  }

  const modelSelect = (
    <select value={model} onChange={(e) => setModel(e.target.value)} disabled={busy} className="rounded-md border border-border bg-white px-2 py-1.5 text-xs text-muted-foreground outline-none">
      {SELECTABLE_AI_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
    </select>
  )

  return (
    <div className="rounded-xl border border-[#c4910a]/30 bg-[#fffdf7] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#1a1a2e]">
          <Sparkles className="h-4 w-4 text-[#c4910a]" /> {mode === "create" ? "Create article with AI" : "AI assistance"}
        </span>
        {onClose && (
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-black/5" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Create: instruction → generate (until there's a draft) */}
      {mode === "create" && !draft.trim() && (
        <>
          <p className="text-sm text-muted-foreground">Describe the article and I&apos;ll draft it in your voice. You can then refine it as many times as you like. Drafting uses one generation; refinements are essentially free.</p>
          <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={2} placeholder="e.g. A recap of last week's town hall and what comes next" disabled={busy} className={`mt-3 ${inputCls} resize-none`} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button onClick={generate} disabled={busy || !instruction.trim()}>
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
              {busy ? "Drafting…" : "Draft article"}
            </Button>
            {modelSelect}
          </div>
        </>
      )}

      {/* Draft present: editable prose + refine loop + accept */}
      {(draft.trim() || mode === "assist") && (
        <>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Article draft — headline on the first line, then the body</label>
          <textarea ref={draftRef} value={draft} onChange={(e) => setDraft(e.target.value)} rows={10} disabled={busy} placeholder="Your article draft appears here — you can edit it directly." className={`${inputCls} resize-y leading-relaxed`} />

          <RefineComments getSelection={getSelection} onSubmit={revise} busy={busy} />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button onClick={accept} disabled={busy || !draft.trim()}>
              <Check className="mr-1.5 h-4 w-4" /> {mode === "create" ? "Insert as article" : "Apply to article"}
            </Button>
            {mode === "create" && (
              <Button variant="ghost" onClick={() => { setDraft(""); setError(null) }} disabled={busy}>Start over</Button>
            )}
            {modelSelect}
          </div>
        </>
      )}

      {error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  )
}
