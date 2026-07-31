"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Check, Copy, ExternalLink, Sparkles, SlidersHorizontal, Newspaper, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { setPublished } from "@/app/website/actions"
import { WebsiteAgent } from "./WebsiteAgent"
import { WebsiteBuilder, type EditorSite } from "./WebsiteBuilder"

type Mode = "assistant" | "advanced"

export function WebsiteWorkspace({
  campaignId,
  site,
  pendingSignups,
  editsUsed,
  editsLimit,
  defaultModel,
}: {
  campaignId: string
  site: EditorSite
  pendingSignups: number
  editsUsed: number
  editsLimit: number | null
  defaultModel: string
}) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("assistant")
  const [publishing, startPublishing] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [origin, setOrigin] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => setOrigin(window.location.origin), [])
  const publicUrl = `${origin}/websites/${campaignId}`

  function togglePublish() {
    const next = !site.published
    setError(null)
    startPublishing(async () => {
      const res = await setPublished(next)
      if (res.ok) router.refresh()
      else setError(res.error)
    })
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const pageRefs = site.pages.map((p) => ({ slug: p.slug, title: p.title, isHome: p.isHome }))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Candidate Website</h1>
          <p className="mt-1 text-muted-foreground">Chat to build your site, or edit the blocks by hand.</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link
              href="/website/settings"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1b3a6b] hover:underline"
            >
              <Settings className="h-4 w-4" />
              Site settings
            </Link>
            <Link
              href="/website/press"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1b3a6b] hover:underline"
            >
              <Newspaper className="h-4 w-4" />
              Press coverage
            </Link>
          </div>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-white p-0.5">
          <button
            onClick={() => setMode("assistant")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
              mode === "assistant" ? "bg-[#1b3a6b] text-white" : "text-muted-foreground hover:text-[#1a1a2e]"
            }`}
          >
            <Sparkles className="h-4 w-4" /> Assistant
          </button>
          <button
            onClick={() => setMode("advanced")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
              mode === "advanced" ? "bg-[#1b3a6b] text-white" : "text-muted-foreground hover:text-[#1a1a2e]"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" /> Edit blocks
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      {/* Publish bar (shared across both modes) */}
      <div className="rounded-2xl border border-border bg-white px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-2.5 w-2.5 rounded-full ${site.published ? "bg-[#1e6b3a]" : "bg-muted-foreground/40"}`}
              />
              <span className="font-semibold text-[#1a1a2e]">
                {site.published ? "Live" : "Draft — not public yet"}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="rounded bg-[#f4f6f9] px-2 py-1 text-xs text-muted-foreground">{publicUrl}</code>
              <button onClick={copyUrl} className="text-muted-foreground hover:text-[#1a1a2e]" title="Copy URL">
                {copied ? <Check className="h-4 w-4 text-[#1e6b3a]" /> : <Copy className="h-4 w-4" />}
              </button>
              {site.published && (
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#c4910a] hover:underline"
                >
                  View live <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
          <Button variant={site.published ? "outline" : "default"} onClick={togglePublish} disabled={publishing}>
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : site.published ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </div>

      {mode === "assistant" ? (
        <WebsiteAgent
          campaignId={campaignId}
          pages={pageRefs}
          editsUsed={editsUsed}
          editsLimit={editsLimit}
          defaultModel={defaultModel}
          published={site.published}
        />
      ) : (
        <WebsiteBuilder site={site} pendingSignups={pendingSignups} />
      )}
    </div>
  )
}
