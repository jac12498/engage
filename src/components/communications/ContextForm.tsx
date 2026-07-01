"use client"

import { useRef, useState, useTransition } from "react"
import { Loader2, Link2, FileUp, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { saveContextItem } from "@/app/communications/actions"
import { inputCls, type ContextDTO } from "./shared"

type RefType = "url" | "website" | "document"

const REF_TYPES: { id: RefType; label: string }[] = [
  { id: "url", label: "URL" },
  { id: "website", label: "Website" },
  { id: "document", label: "Document" },
]

export type TopicRef = { id: string; title: string }
export type CtxType = "note" | "position" | "reference"

export const CONTEXT_TYPE_LABEL: Record<CtxType, string> = {
  note: "Note",
  position: "Position",
  reference: "Reference",
}

export function ContextForm({
  initial,
  topics,
  defaultTopicId,
  onDone,
  onCancel,
}: {
  initial?: ContextDTO
  topics: TopicRef[]
  /** Preset the scope for a new item (e.g. on a topic's page). */
  defaultTopicId?: string
  onDone: () => void
  onCancel: () => void
}) {
  const [type, setType] = useState<CtxType>((initial?.type as CtxType) ?? "note")
  const [refType, setRefType] = useState<RefType>(
    initial?.refType === "website" ? "website" : initial?.refType === "document" ? "document" : "url"
  )
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [topicId, setTopicId] = useState(initial?.topicId ?? defaultTopicId ?? "")
  const [title, setTitle] = useState(initial?.title ?? "")
  const [body, setBody] = useState(initial?.body ?? "")
  const [keyPoints, setKeyPoints] = useState((initial?.keyPoints ?? []).join("\n"))
  const [url, setUrl] = useState(initial?.url ?? "")
  const [source, setSource] = useState(initial?.source ?? "")
  const [fetching, setFetching] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  async function fetchSummary() {
    setError(null)
    setFetching(true)
    try {
      const res = await fetch("/api/communications/news/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const d = await res.json()
      if (!res.ok) {
        setError(d.error || "Could not summarize that link.")
        return
      }
      setTitle(d.title || "")
      setSource(d.source || "")
      setBody(d.summary || "")
    } catch {
      setError("Could not reach that link.")
    } finally {
      setFetching(false)
    }
  }

  async function crawlWebsite() {
    setError(null)
    setPageCount(null)
    setFetching(true)
    try {
      const res = await fetch("/api/communications/reference/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const d = await res.json()
      if (!res.ok) {
        setError(d.error || "Could not crawl that site.")
        return
      }
      setTitle(d.title || "")
      setSource(d.source || "")
      setBody(d.summary || "")
      setPageCount(d.pageCount ?? null)
    } catch {
      setError("Could not reach that site.")
    } finally {
      setFetching(false)
    }
  }

  async function summarizeDocument(file: File) {
    setError(null)
    setFileName(file.name)
    setFetching(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/communications/reference/document", { method: "POST", body: fd })
      const d = await res.json()
      if (!res.ok) {
        setError(d.error || "Could not read that PDF.")
        return
      }
      setTitle(d.title || file.name.replace(/\.pdf$/i, ""))
      setSource(d.source || "")
      setBody(d.summary || "")
    } catch {
      setError("Could not process that file.")
    } finally {
      setFetching(false)
    }
  }

  function submit() {
    setError(null)
    start(async () => {
      const r = await saveContextItem({
        id: initial?.id,
        type,
        topicId: topicId || null,
        title,
        body,
        keyPoints: type === "position" ? keyPoints.split("\n") : undefined,
        url: type === "reference" && refType !== "document" ? url : undefined,
        source: type === "reference" ? source : undefined,
        refType: type === "reference" ? refType : undefined,
      })
      if (r.ok) onDone()
      else setError(r.error ?? "Could not save.")
    })
  }

  const bodyLabel = type === "position" ? "Stance" : type === "reference" ? "Summary" : "Context"
  const titlePlaceholder =
    type === "position" ? "Issue (e.g. Property taxes)" : type === "reference" ? "Headline" : "Label (optional)"

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#1a1a2e]">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as CtxType)} className={inputCls}>
            <option value="note">Note — plain background</option>
            <option value="position">Position — a stance + talking points</option>
            <option value="reference">Reference — press / article</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#1a1a2e]">Applies to</label>
          <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className={inputCls}>
            <option value="">General — every communication</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                Topic: {t.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {type === "reference" && (
        <div className="space-y-2">
          <div className="flex gap-1 rounded-lg border border-border p-1 text-xs">
            {REF_TYPES.map((rt) => (
              <button
                key={rt.id}
                type="button"
                onClick={() => setRefType(rt.id)}
                className={`flex-1 rounded-md px-2 py-1.5 font-medium transition-colors ${
                  refType === rt.id ? "bg-[#1b3a6b] text-white" : "text-muted-foreground"
                }`}
              >
                {rt.label}
              </button>
            ))}
          </div>

          {refType === "url" && (
            <div className="flex gap-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste a page URL to auto-summarize…"
                className={inputCls}
              />
              <Button variant="outline" onClick={fetchSummary} disabled={!url.trim() || fetching}>
                {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {refType === "website" && (
            <div>
              <div className="flex gap-2">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Site URL, e.g. https://coalition.org"
                  className={inputCls}
                />
                <Button variant="outline" onClick={crawlWebsite} disabled={!url.trim() || fetching}>
                  {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Reads the site&apos;s main pages (up to ~20) and summarizes them.
                {pageCount != null && ` Read ${pageCount} page${pageCount === 1 ? "" : "s"}.`}
              </p>
            </div>
          )}

          {refType === "document" && (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) summarizeDocument(f)
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={fetching}
              >
                {fetching ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <FileUp className="mr-1.5 h-4 w-4" />
                )}
                {fileName ? "Choose a different PDF" : "Upload a PDF to summarize"}
              </Button>
              {fileName && <p className="mt-1 text-xs text-muted-foreground">{fileName}</p>}
            </div>
          )}
        </div>
      )}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={titlePlaceholder}
        className={inputCls}
      />

      {type === "reference" && (
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Source / outlet (optional)"
          className={inputCls}
        />
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-[#1a1a2e]">{bodyLabel}</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={type === "position" ? 2 : 4}
          placeholder={
            type === "position"
              ? "Your position in a sentence or two"
              : type === "reference"
                ? "What happened / why it matters"
                : "Background, facts, details…"
          }
          className={inputCls}
        />
      </div>

      {type === "position" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-[#1a1a2e]">Talking points</label>
          <textarea
            value={keyPoints}
            onChange={(e) => setKeyPoints(e.target.value)}
            rows={3}
            placeholder="One per line"
            className={inputCls}
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={submit} disabled={pending || !body.trim()}>
          {pending ? "Saving…" : "Save context"}
        </Button>
        <button onClick={onCancel} className="px-3 py-2 text-sm text-muted-foreground hover:text-[#1a1a2e]">
          Cancel
        </button>
      </div>
    </div>
  )
}
