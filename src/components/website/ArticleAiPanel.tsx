"use client"

import { useRef, useState } from "react"
import { Loader2, Sparkles, Check, X, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RefineComments } from "@/components/communications/RefineComments"
import { SELECTABLE_AI_MODELS } from "@/lib/entitlements"
import { parseArticleProse } from "@/lib/newsletter/articleDraft"
import { saveGeneration } from "@/app/communications/actions"

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"

type Version = { content: string; revisionNote: string | null; model: string }
type Topic = { id: string; title: string }

/**
 * Inline AI authoring for a single newsletter article. Reuses the Communications
 * engine: streams from /api/communications/generate (create) and /revise (refine),
 * with the same grounding (profile, voice, context) and an optional Topic. The
 * draft is plain prose (headline line + body) the user can hand-edit; on accept it
 * parses to { title, body } for the parent to map to blocks. Saving to the
 * Communications library is explicit (medium "newsletter") and preserves the refine
 * version chain.
 *
 * - mode "create": start from a topic/description → Generate → refine → Insert.
 * - mode "assist": start seeded from the article's current prose → refine → Apply.
 */
export function ArticleAiPanel({
  mode,
  defaultModel,
  topics,
  initialDraft = "",
  onAccept,
  onClose,
}: {
  mode: "create" | "assist"
  defaultModel: string
  topics: Topic[]
  initialDraft?: string
  onAccept: (title: string, body: string) => void
  onClose?: () => void
}) {
  const [model, setModel] = useState(defaultModel)
  const [lastModel, setLastModel] = useState(defaultModel)
  const [topicId, setTopicId] = useState("")
  const [instruction, setInstruction] = useState("")
  const [draft, setDraft] = useState(initialDraft)
  const [versions, setVersions] = useState<Version[]>(
    initialDraft.trim() ? [{ content: initialDraft, revisionNote: null, model: defaultModel }] : []
  )
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const draftRef = useRef<HTMLTextAreaElement>(null)

  async function stream(url: string, payload: Record<string, unknown>): Promise<{ text: string; model: string } | null> {
    setBusy(true)
    setError(null)
    setSavedId(null)
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.status === 429) {
        setError("You're out of Model Credits this month.")
        return null
      }
      if (!res.ok || !res.body) {
        setError((await res.text().catch(() => "")) || "Generation failed. Please try again.")
        return null
      }
      const usedModel = res.headers.get("X-Model") || model
      setLastModel(usedModel)
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
      return { text: acc, model: usedModel }
    } catch {
      setError("Generation failed. Please try again.")
      return null
    } finally {
      setBusy(false)
    }
  }

  async function generate() {
    const t = instruction.trim()
    if (!t && !topicId) return
    const r = await stream("/api/communications/generate", {
      type: "newsletter_article",
      topicId: topicId || null,
      newsHook: topicId ? null : t,
      additionalContext: topicId ? t || null : null,
      model,
    })
    if (r) setVersions([{ content: r.text, revisionNote: null, model: r.model }])
  }

  async function revise(notes: string) {
    if (!draft.trim()) return
    const r = await stream("/api/communications/revise", {
      type: "newsletter_article",
      currentDraft: draft,
      notes,
      topicId: topicId || null,
      model,
    })
    if (r) setVersions((v) => [...v, { content: r.text, revisionNote: notes, model: r.model }])
  }

  function accept() {
    const { title, body } = parseArticleProse(draft)
    if (!title && !body.trim()) return
    onAccept(title, body)
    if (mode === "create") {
      setDraft("")
      setInstruction("")
      setVersions([])
      setSavedId(null)
    }
  }

  async function saveToComms() {
    if (!draft.trim()) return
    // Preserve the refine history; capture a trailing manual edit as a version.
    const chain: Version[] = versions.length ? [...versions] : [{ content: draft, revisionNote: null, model: lastModel }]
    if (versions.length && draft !== versions[versions.length - 1].content) {
      chain.push({ content: draft, revisionNote: null, model: lastModel })
    }
    const { title } = parseArticleProse(draft)
    const selectedTopic = topics.find((t) => t.id === topicId) ?? null
    setSaving(true)
    setError(null)
    try {
      const r = await saveGeneration({
        type: "newsletter_article",
        medium: "newsletter",
        topicId: topicId || null,
        topicLabel: selectedTopic?.title ?? null,
        newsHook: topicId ? null : instruction.trim() || null,
        title: title || null,
        model: lastModel,
        content: draft,
        versions: chain,
      })
      if (r.ok) setSavedId(r.id)
      else setError(r.error)
    } finally {
      setSaving(false)
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

      {/* Topic — same grounding option the other Communications generators have */}
      {topics.length > 0 && (
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Topic (optional)</span>
          <select value={topicId} onChange={(e) => setTopicId(e.target.value)} disabled={busy} className={inputCls}>
            <option value="">No topic — use general campaign context</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </label>
      )}

      {/* Create: description → generate (until there's a draft) */}
      {mode === "create" && !draft.trim() && (
        <>
          <p className="text-sm text-muted-foreground">{topicId ? "Add any extra guidance for this article (optional), then draft." : "Describe the article and I'll draft it in your voice."} You can refine it as many times as you like — drafting uses one generation; refinements are essentially free.</p>
          <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={2} placeholder={topicId ? "e.g. Focus on the vote next Tuesday and how to help" : "e.g. A recap of last week's town hall and what comes next"} disabled={busy} className={`mt-3 ${inputCls} resize-none`} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button onClick={generate} disabled={busy || (!instruction.trim() && !topicId)}>
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
              {busy ? "Drafting…" : "Draft article"}
            </Button>
            {modelSelect}
          </div>
        </>
      )}

      {/* Draft present: editable prose + refine loop + accept / save */}
      {(draft.trim() || mode === "assist") && (
        <>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Article draft — headline on the first line, then the body</label>
          <textarea ref={draftRef} value={draft} onChange={(e) => { setDraft(e.target.value); setSavedId(null) }} rows={10} disabled={busy} placeholder="Your article draft appears here — you can edit it directly." className={`${inputCls} resize-y leading-relaxed`} />

          <RefineComments getSelection={getSelection} onSubmit={revise} busy={busy} />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button onClick={accept} disabled={busy || !draft.trim()}>
              <Check className="mr-1.5 h-4 w-4" /> {mode === "create" ? "Insert as article" : "Apply to article"}
            </Button>
            <Button variant="outline" onClick={saveToComms} disabled={busy || saving || !draft.trim()}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Save to Communications
            </Button>
            {mode === "create" && (
              <Button variant="ghost" onClick={() => { setDraft(""); setVersions([]); setSavedId(null); setError(null) }} disabled={busy}>Start over</Button>
            )}
            {modelSelect}
          </div>

          {savedId && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#1e6b3a]/25 bg-[#1e6b3a]/8 px-3 py-2 text-sm text-[#1e6b3a]">
              <Check className="h-4 w-4" /> Saved to <a href="/communications/newsletter" className="font-medium underline">Communications → Newsletter Articles</a>.
            </p>
          )}
        </>
      )}

      {error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  )
}
