"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { X, Loader2, Sparkles, Copy, Check, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RefineComments } from "./RefineComments"
import {
  CONTENT_TYPES,
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_ICONS,
  mediumForType,
  isContentType,
  type ContentType,
} from "@/lib/comms/prompts"
import {
  canSelectModel,
  SELECTABLE_AI_MODELS,
  GENERATION_LIMITS,
  DEFAULT_AI_MODEL,
  type PlanId,
} from "@/lib/entitlements"
import { saveGeneration, getGenerationForEdit } from "@/app/communications/actions"
import { inputCls } from "./shared"

type Version = { content: string; revisionNote: string | null; model: string }

export function TopicGenerateDialog({
  topic,
  plan,
  generationsUsed,
  initialGenerationId,
  onClose,
}: {
  topic: { id: string; title: string }
  plan: PlanId
  generationsUsed: number
  /** When set, open this saved generation for continued refinement. */
  initialGenerationId?: string
  onClose: () => void
}) {
  const router = useRouter()
  const [type, setType] = useState<ContentType>("press_release")
  const [message, setMessage] = useState("")
  const [model, setModel] = useState(DEFAULT_AI_MODEL)

  const [output, setOutput] = useState("")
  const [title, setTitle] = useState("")
  const [lastModel, setLastModel] = useState(DEFAULT_AI_MODEL)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [used, setUsed] = useState(generationsUsed)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saving, startSaving] = useTransition()

  // Refine loop.
  const [versions, setVersions] = useState<Version[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [revising, setRevising] = useState(false)
  const draftRef = useRef<HTMLTextAreaElement>(null)
  const getSelection = () => {
    const el = draftRef.current
    return el ? el.value.substring(el.selectionStart, el.selectionEnd) : ""
  }
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!initialGenerationId)

  const limit = GENERATION_LIMITS[plan]
  const canPickModel = canSelectModel(plan)

  // Load an existing generation to continue refining.
  useEffect(() => {
    if (!initialGenerationId) return
    let cancelled = false
    ;(async () => {
      const r = await getGenerationForEdit(initialGenerationId)
      if (cancelled) return
      if (r.ok) {
        const g = r.generation
        if (isContentType(g.type)) setType(g.type)
        setTitle(g.title ?? "")
        setLastModel(g.model)
        const vs: Version[] = g.versions.length
          ? g.versions
          : [{ content: g.content, revisionNote: null, model: g.model }]
        setVersions(vs)
        setActiveIndex(vs.length - 1)
        setOutput(vs[vs.length - 1].content)
        setEditingId(g.id)
      } else {
        setError(r.error)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [initialGenerationId])

  async function generate() {
    setError(null)
    setSaved(false)
    setOutput("")
    setGenerating(true)
    try {
      const res = await fetch("/api/communications/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, topicId: topic.id, additionalContext: message, model }),
      })
      if (res.status === 429) {
        const d = await res.json()
        setError(`You've used all ${d.limit} generations this month. Upgrade to Campaign for unlimited.`)
        return
      }
      if (!res.ok || !res.body) {
        setError((await res.text()) || "Generation failed.")
        return
      }
      const usedModel = res.headers.get("X-Model") || model
      setLastModel(usedModel)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ""
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setOutput(acc)
      }
      setVersions([{ content: acc, revisionNote: null, model: usedModel }])
      setActiveIndex(0)
      const usedHeader = res.headers.get("X-Generations-Used")
      if (usedHeader) setUsed(Number(usedHeader))
    } catch {
      setError("Generation failed. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  async function revise(notes: string) {
    if (!output.trim() || !notes.trim()) return
    setError(null)
    setSaved(false)
    setRevising(true)
    try {
      const res = await fetch("/api/communications/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          currentDraft: output,
          notes,
          topicId: topic.id,
          model,
        }),
      })
      if (res.status === 429) {
        const d = await res.json()
        setError(`You've hit your monthly limit (${d.limit}). Upgrade to Campaign for unlimited.`)
        return
      }
      if (!res.ok || !res.body) {
        setError((await res.text()) || "Revision failed.")
        return
      }
      const usedModel = res.headers.get("X-Model") || model
      setLastModel(usedModel)
      const note = notes
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ""
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setOutput(acc)
      }
      setVersions((prev) => {
        const next = [...prev, { content: acc, revisionNote: note, model: usedModel }]
        setActiveIndex(next.length - 1)
        return next
      })
      const usedHeader = res.headers.get("X-Generations-Used")
      if (usedHeader) setUsed(Number(usedHeader))
    } catch {
      setError("Revision failed. Please try again.")
    } finally {
      setRevising(false)
    }
  }

  function restoreVersion(i: number) {
    setActiveIndex(i)
    setOutput(versions[i].content)
  }

  function save() {
    startSaving(async () => {
      const chain: Version[] = versions.length
        ? [...versions]
        : [{ content: output, revisionNote: null, model: lastModel }]
      if (versions.length && output !== versions[activeIndex]?.content) {
        chain.push({ content: output, revisionNote: null, model: lastModel })
      }
      const r = await saveGeneration({
        id: editingId ?? undefined,
        type,
        medium: mediumForType(type),
        topicId: topic.id,
        topicLabel: topic.title,
        title: title || null,
        model: lastModel,
        content: output,
        versions: chain,
      })
      if (r.ok) {
        setSaved(true)
        setEditingId(r.id)
        router.refresh()
      } else {
        setError(r.error)
      }
    })
  }

  async function copy() {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const showControls = !editingId

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div
        className="mx-auto mt-8 w-full max-w-2xl rounded-2xl border border-border bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#1a1a2e]">{editingId ? "Refine" : "Generate"}</h2>
            <p className="text-sm text-muted-foreground">
              On topic: <span className="font-medium text-[#1a1a2e]">{topic.title}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {limit != null && (
              <span className="rounded-full border border-border bg-[#f4f6f9] px-3 py-1 text-xs font-medium text-muted-foreground">
                {used} / {limit} this month
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-[#1a1a2e]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {loading && (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          )}

          {showControls && (
            <>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#1a1a2e]">Format</label>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        type === t
                          ? "border-[#1b3a6b] bg-[#1b3a6b]/5 font-medium text-[#1a1a2e]"
                          : "border-border text-muted-foreground hover:border-[#1b3a6b]/40"
                      }`}
                    >
                      <span>{CONTENT_TYPE_ICONS[t]}</span>
                      <span>{CONTENT_TYPE_LABELS[t]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[#1a1a2e]">Your Message</label>
                <p className="mb-2 text-sm text-muted-foreground">
                  What do you want this {CONTENT_TYPE_LABELS[type].toLowerCase()} to say?
                </p>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="The occasion, your main message, and any specifics…"
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  {canPickModel ? (
                    <label className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-[#1a1a2e]">Model</span>
                      <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"
                      >
                        {SELECTABLE_AI_MODELS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <p className="text-xs text-muted-foreground">Model: Haiku 4.5</p>
                  )}
                </div>
                <div className="flex flex-col items-stretch gap-1 sm:items-end">
                  <Button onClick={generate} disabled={generating} className="sm:w-48">
                    {generating ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Generating…
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-1.5 h-4 w-4" /> Generate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </p>
          )}

          {(generating || output || versions.length > 0) && (
            <div>
              {/* Version bar */}
              {versions.length > 0 && (
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Versions:</span>
                  {versions.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => restoreVersion(i)}
                      title={v.revisionNote ?? "Original draft"}
                      className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                        i === activeIndex
                          ? "bg-[#1b3a6b] text-white"
                          : "border border-border text-muted-foreground hover:text-[#1a1a2e]"
                      }`}
                    >
                      v{i + 1}
                    </button>
                  ))}
                  {activeIndex !== versions.length - 1 && (
                    <span className="inline-flex items-center gap-1 text-xs text-[#c4910a]">
                      <RotateCcw className="h-3 w-3" /> earlier version
                    </span>
                  )}
                </div>
              )}

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional title (for your records)"
                className={`${inputCls} mb-2`}
              />
              <textarea
                ref={draftRef}
                value={output}
                onChange={(e) => setOutput(e.target.value)}
                placeholder="Your draft will stream in here. You can edit it before saving."
                className="min-h-[300px] w-full rounded-lg border border-border bg-white p-4 font-mono text-sm leading-relaxed text-[#1a1a2e] outline-none focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"
              />

              {/* Refine loop */}
              {output.trim() && (
                <RefineComments getSelection={getSelection} onSubmit={revise} busy={revising} />
              )}

              <div className="mt-3 flex items-center gap-2">
                <Button onClick={save} disabled={!output.trim() || saving}>
                  {saved ? <Check className="mr-1.5 h-4 w-4" /> : null}
                  {saved ? "Saved" : saving ? "Saving…" : editingId ? "Update" : "Save"}
                </Button>
                <button
                  onClick={copy}
                  disabled={!output.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-[#1a1a2e] disabled:opacity-40"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button onClick={onClose} className="ml-auto text-sm text-muted-foreground hover:text-[#1a1a2e]">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
