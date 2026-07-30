"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Send, Sparkles, Check, ExternalLink, RefreshCw, ArrowRight } from "lucide-react"
import { SELECTABLE_AI_MODELS, PLAN_LABELS } from "@/lib/entitlements"

interface PageRef {
  slug: string
  title: string
  isHome: boolean
}

interface ChatMessage {
  role: "user" | "assistant"
  text: string
  tools: string[]
  pending?: boolean
}

const SUGGESTIONS = [
  "Add an endorsements section to my home page",
  "Write me an About page",
  "Change my colors to navy and gold",
  "Add a news & updates section",
]

export function WebsiteAgent({
  campaignId,
  pages,
  editsUsed,
  editsLimit,
  defaultModel,
  published,
}: {
  campaignId: string
  pages: PageRef[]
  editsUsed: number
  editsLimit: number | null
  defaultModel: string
  published: boolean
}) {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [model, setModel] = useState(defaultModel)
  const [used, setUsed] = useState(editsUsed)
  const [busy, setBusy] = useState(false)
  const [limitHit, setLimitHit] = useState(false)
  const [previewSlug, setPreviewSlug] = useState<string>(() => pages.find((p) => p.isHome)?.slug ?? pages[0]?.slug ?? "")
  const [previewVersion, setPreviewVersion] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const remaining = editsLimit == null ? null : Math.max(0, editsLimit - used)
  const previewPath =
    previewSlug && !pages.find((p) => p.slug === previewSlug)?.isHome
      ? `/website/preview/${previewSlug}`
      : "/website/preview"
  const previewSrc = `${previewPath}?v=${previewVersion}`

  function scrollDown() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    })
  }

  async function send(text: string) {
    const content = text.trim()
    if (!content || busy) return
    setInput("")
    setLimitHit(false)

    const history = messages
      .filter((m) => m.text.trim())
      .map((m) => ({ role: m.role, text: m.text }))
    const outgoing = [...history, { role: "user" as const, text: content }]

    setMessages((prev) => [
      ...prev,
      { role: "user", text: content, tools: [] },
      { role: "assistant", text: "", tools: [], pending: true },
    ])
    setBusy(true)
    scrollDown()

    try {
      const res = await fetch("/api/website/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: outgoing, model }),
      })

      if (res.status === 429) {
        setLimitHit(true)
        setMessages((prev) => prev.slice(0, -1)) // drop the pending assistant bubble
        setBusy(false)
        return
      }
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "")
        patchLast({
          text: detail
            ? `Something went wrong (${res.status}): ${detail}`
            : "Something went wrong. Please try again.",
          pending: false,
        })
        setBusy(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let mutated = false

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const l of lines) {
          if (!l.trim()) continue
          let ev: { type: string; [k: string]: unknown }
          try {
            ev = JSON.parse(l)
          } catch {
            continue
          }
          if (ev.type === "tool") {
            appendTool(String(ev.summary))
            mutated = true
          } else if (ev.type === "text") {
            patchLast({ text: String(ev.text) })
          } else if (ev.type === "done") {
            if (typeof ev.used === "number") setUsed(ev.used)
            if (ev.mutated) mutated = true
          } else if (ev.type === "error") {
            patchLast({ text: String(ev.error) })
          }
          scrollDown()
        }
      }

      patchLast({ pending: false })
      if (mutated) {
        setPreviewVersion((v) => v + 1)
        router.refresh() // refresh pages list + usage-derived server props
      }
    } catch {
      patchLast({ text: "The connection dropped. Please try again.", pending: false })
    } finally {
      setBusy(false)
    }
  }

  function patchLast(patch: Partial<ChatMessage>) {
    setMessages((prev) => {
      const next = prev.slice()
      const i = next.length - 1
      if (i >= 0 && next[i].role === "assistant") next[i] = { ...next[i], ...patch }
      return next
    })
  }
  function appendTool(summary: string) {
    setMessages((prev) => {
      const next = prev.slice()
      const i = next.length - 1
      if (i >= 0 && next[i].role === "assistant") next[i] = { ...next[i], tools: [...next[i].tools, summary] }
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Live preview */}
      <div className="flex h-[55vh] min-h-[24rem] flex-col overflow-hidden rounded-2xl border border-border bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Preview</span>
            {pages.length > 1 && (
              <select
                value={previewSlug}
                onChange={(e) => setPreviewSlug(e.target.value)}
                className="rounded-md border border-border bg-white px-2 py-1 text-xs outline-none"
              >
                {pages.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.title}
                    {p.isHome ? " (home)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPreviewVersion((v) => v + 1)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-[#1a1a2e]"
              title="Refresh preview"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            {published && (
              <a
                href={`/websites/${campaignId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#c4910a] hover:underline"
              >
                View live <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
        <iframe key={previewVersion} src={previewSrc} title="Website preview" className="flex-1 w-full bg-white" />
      </div>

      {/* Chat */}
      <div className="flex h-[calc(100vh-13rem)] min-h-[32rem] flex-col rounded-2xl border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#1a1a2e]">
            <Sparkles className="h-4 w-4 text-[#c4910a]" /> Website assistant
          </span>
          {remaining != null && (
            <span className="text-xs text-muted-foreground">{remaining} edits left this month</span>
          )}
        </div>

        {/* Composer — kept just under the preview so it's close at hand */}
        <div className="border-b border-border p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  send(input)
                }
              }}
              rows={2}
              placeholder="Ask for a change…"
              disabled={busy}
              className="flex-1 resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#1b3a6b] text-white disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
          <div className="mt-2 flex items-center justify-between">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded-md border border-border bg-white px-2 py-1 text-xs text-muted-foreground outline-none"
            >
              {SELECTABLE_AI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-muted-foreground">
              The assistant edits your live draft. Publish when you&apos;re ready.
            </span>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tell me what you&apos;d like to change and I&apos;ll build it — add sections and pages, rewrite copy,
                adjust your colors. Try:
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-[#1a1a2e] hover:border-[#1b3a6b]/40 hover:bg-muted/40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#1b3a6b] px-3.5 py-2 text-sm text-white">
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={i} className="space-y-1.5">
                {m.tools.length > 0 && (
                  <ul className="space-y-1">
                    {m.tools.map((t, j) => (
                      <li key={j} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-[#1e6b3a]" /> {t}
                      </li>
                    ))}
                  </ul>
                )}
                {m.pending && !m.text ? (
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Working…
                  </div>
                ) : (
                  m.text && (
                    <div className="max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-muted/50 px-3.5 py-2 text-sm text-[#1a1a2e]">
                      {m.text}
                    </div>
                  )
                )}
              </div>
            )
          )}

          {limitHit && (
            <div className="rounded-xl border border-[#c4910a]/30 bg-[#f0b429]/10 p-4 text-sm">
              <p className="font-medium text-[#7a5a00]">You&apos;ve used all your builder edits this month.</p>
              <p className="mt-1 text-[#7a5a00]/90">
                Upgrade to {PLAN_LABELS.campaign} for unlimited website editing.
              </p>
              <Link href="/dashboard" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#1b3a6b] hover:underline">
                See plans <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
