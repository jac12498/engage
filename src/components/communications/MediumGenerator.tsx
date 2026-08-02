"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Copy, Check, Sparkles, Wand2, RotateCcw, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RefineComments } from "./RefineComments"
import {
  MEDIUM_TYPES,
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_ICONS,
  isContentType,
  type ContentType,
  type Medium,
} from "@/lib/comms/prompts"
import {
  SELECTABLE_AI_MODELS,
  CREDIT_LIMITS,
  DEFAULT_AI_MODEL,
  creditCost,
  type PlanId,
} from "@/lib/entitlements"
import { saveGeneration, getGenerationForEdit } from "@/app/communications/actions"
import { HistoryPanel } from "./HistoryPanel"
import { UpgradeModal } from "./UpgradeModal"
import { inputCls, type TopicDTO, type GenDTO } from "./shared"

type Version = { content: string; revisionNote: string | null; model: string }

/** Which model-comparison tab a given medium deep-links to on the examples page. */
const EXAMPLE_FORMAT: Record<Medium, string> = {
  speeches: "speech",
  letters: "letter",
  social: "social",
  print: "print",
  newsletter: "letter", // no dedicated example set; a letter is the closest prose analog
}

export function MediumGenerator({
  medium,
  mediumLabel,
  plan,
  creditsUsed,
  topics,
  generations,
}: {
  medium: Medium
  mediumLabel: string
  plan: PlanId
  creditsUsed: number
  topics: TopicDTO[]
  generations: GenDTO[]
}) {
  const router = useRouter()
  const formats = MEDIUM_TYPES[medium]

  const [type, setType] = useState<ContentType>(formats[0])
  const [useTopic, setUseTopic] = useState(topics.length > 0)
  const [topicId, setTopicId] = useState(topics[0]?.id ?? "")
  const [customTopic, setCustomTopic] = useState("")
  const [additionalContext, setAdditionalContext] = useState("")
  const [model, setModel] = useState(DEFAULT_AI_MODEL)

  const [output, setOutput] = useState("")
  const [title, setTitle] = useState("")
  const [lastModel, setLastModel] = useState(DEFAULT_AI_MODEL)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [used, setUsed] = useState(creditsUsed)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saving, startSaving] = useTransition()

  // Refine loop: the version history + the current revision notes.
  const [versions, setVersions] = useState<Version[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [revising, setRevising] = useState(false)
  const draftRef = useRef<HTMLTextAreaElement>(null)
  const getSelection = () => {
    const el = draftRef.current
    return el ? el.value.substring(el.selectionStart, el.selectionEnd) : ""
  }
  // The saved piece currently loaded for continued refinement (null = new draft).
  const [editingId, setEditingId] = useState<string | null>(null)

  const limit = CREDIT_LIMITS[plan]
  const remaining = limit != null ? Math.max(0, limit - used) : null
  const selectedCost = creditCost(model)
  // Overdraft: fewer credits left than the picked model costs, but still > 0.
  // We let it run and charge only what's left — the last-generation upsell moment.
  const overdraft = remaining != null && remaining > 0 && remaining < selectedCost
  const noTopics = topics.length === 0
  const selectedTopic = topics.find((t) => t.id === topicId) ?? null

  async function generate() {
    setError(null)
    setSaved(false)
    setOutput("")
    setGenerating(true)
    try {
      const res = await fetch("/api/communications/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          topicId: useTopic ? topicId : null,
          newsHook: useTopic ? null : customTopic,
          additionalContext,
          model,
        }),
      })

      if (res.status === 429) {
        setShowUpgrade(true)
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
      // Start a fresh version history with this draft as v1.
      setVersions([{ content: acc, revisionNote: null, model: usedModel }])
      setActiveIndex(0)
      const usedHeader = res.headers.get("X-Credits-Used")
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
          topicId: useTopic ? topicId : null,
          model,
        }),
      })

      if (res.status === 429) {
        setShowUpgrade(true)
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
      // Append the revised draft as a new version (linear history).
      setVersions((prev) => {
        const next = [...prev, { content: acc, revisionNote: note, model: usedModel }]
        setActiveIndex(next.length - 1)
        return next
      })
      const usedHeader = res.headers.get("X-Credits-Used")
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

  async function openGeneration(id: string) {
    setError(null)
    const r = await getGenerationForEdit(id)
    if (!r.ok) {
      setError(r.error)
      return
    }
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
    setEditingId(id)
    setSaved(false)
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function startNew() {
    setEditingId(null)
    setVersions([])
    setActiveIndex(0)
    setOutput("")
    setTitle("")
    setSaved(false)
    setError(null)
  }

  function save() {
    startSaving(async () => {
      // Persist the refine history; capture a trailing manual edit as a version.
      const chain: Version[] = versions.length
        ? [...versions]
        : [{ content: output, revisionNote: null, model: lastModel }]
      if (versions.length && output !== versions[activeIndex]?.content) {
        chain.push({ content: output, revisionNote: null, model: lastModel })
      }

      const r = await saveGeneration({
        id: editingId ?? undefined,
        type,
        medium,
        topicId: useTopic ? topicId : null,
        topicLabel: useTopic ? selectedTopic?.title ?? null : customTopic,
        newsHook: useTopic ? null : customTopic,
        title: title || null,
        model: lastModel,
        content: output,
        versions: chain,
      })
      if (r.ok) {
        setSaved(true)
        setEditingId(r.id) // subsequent saves update this piece rather than duplicate
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">{mediumLabel}</h1>
        <p className="mt-1 text-muted-foreground">Generate from a topic, grounded in your profile and context.</p>
      </div>

      {editingId && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1b3a6b]/30 bg-[#1b3a6b]/5 px-4 py-2.5 text-sm">
          <span className="inline-flex items-center gap-1.5 text-[#1a1a2e]">
            <Wand2 className="h-4 w-4 text-[#1b3a6b]" />
            Refining a saved piece — <strong>Save</strong> updates it.
          </span>
          <button
            onClick={startNew}
            className="font-medium text-[#1b3a6b] hover:underline"
          >
            Start a new draft
          </button>
        </div>
      )}

      {/* Generation flow: Format → Topic → References → Context → Generate */}
      <div className="space-y-6 rounded-2xl border border-border bg-white p-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#1a1a2e]">Format</label>
            <div className="flex flex-wrap gap-2">
              {formats.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
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
            <label className="mb-2 block text-sm font-semibold text-[#1a1a2e]">Topic</label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex shrink-0 gap-1 rounded-lg border border-border p-1 text-xs sm:w-56">
                <button
                  onClick={() => setUseTopic(true)}
                  disabled={noTopics}
                  className={`flex-1 rounded-md px-2 py-1.5 font-medium transition-colors disabled:opacity-40 ${
                    useTopic ? "bg-[#1b3a6b] text-white" : "text-muted-foreground"
                  }`}
                >
                  Saved topic
                </button>
                <button
                  onClick={() => setUseTopic(false)}
                  className={`flex-1 rounded-md px-2 py-1.5 font-medium transition-colors ${
                    !useTopic ? "bg-[#1b3a6b] text-white" : "text-muted-foreground"
                  }`}
                >
                  Custom
                </button>
              </div>
              <div className="flex-1">
                {useTopic ? (
                  noTopics ? (
                    <p className="text-xs text-muted-foreground">
                      No topics yet — add some on the Topics page, or switch to Custom.
                    </p>
                  ) : (
                    <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className={inputCls}>
                      {topics.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  )
                ) : (
                  <input
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="e.g. Responding to the county budget vote"
                    className={inputCls}
                  />
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-[#1a1a2e]">Your Message</label>
            <p className="mb-2 text-sm text-muted-foreground">
              What do you want this {CONTENT_TYPE_LABELS[type].toLowerCase()} to say? The occasion,
              your main message, and any specifics (names, dates, numbers).
            </p>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={5}
              placeholder={`e.g. My kickoff ${CONTENT_TYPE_LABELS[type].toLowerCase()} at the Rotary Club dinner — introduce myself, focus on property taxes and the new school budget, and thank local business owners for their support.`}
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <label className="flex items-center gap-2 text-sm">
                <span className="font-medium text-[#1a1a2e]">Model</span>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"
                >
                  {SELECTABLE_AI_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {m.credits} credit{m.credits > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </label>
              {overdraft && (
                <p className="mt-1.5 text-xs text-[#c4910a]">
                  Uses your last {remaining} credit{remaining! > 1 ? "s" : ""}.
                </p>
              )}
              <Link
                href={`/communications/models?format=${EXAMPLE_FORMAT[medium]}`}
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-[#c4910a] hover:underline"
              >
                See examples of each model
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex flex-col items-stretch gap-1 sm:items-end">
              <Button onClick={generate} disabled={generating} className="sm:w-52">
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
              {limit != null && (
                <p className="text-center text-xs text-muted-foreground sm:text-right">
                  {remaining} of {limit} credits left this month
                </p>
              )}
            </div>
          </div>
        </div>

      {/* Output */}
      {(generating || output || versions.length > 0 || error) && (
        <div className="flex flex-col rounded-2xl border border-border bg-white p-6">
          {error && (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </p>
          )}

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
                  <RotateCcw className="h-3 w-3" /> viewing an earlier version
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
            className="min-h-[440px] flex-1 rounded-lg border border-border bg-white p-4 font-mono text-sm leading-relaxed text-[#1a1a2e] outline-none focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"
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
          </div>
        </div>
      )}

      {/* History for this medium */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Saved {mediumLabel.toLowerCase()}
        </h2>
        <HistoryPanel generations={generations} onOpen={openGeneration} />
      </div>

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} limit={limit ?? 0} />
    </div>
  )
}
