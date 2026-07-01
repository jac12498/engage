"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Copy, Check, Trash2, Wand2, ChevronDown, ChevronRight } from "lucide-react"
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_ICONS, type ContentType } from "@/lib/comms/prompts"
import { deleteGeneration } from "@/app/communications/actions"
import type { GenDTO } from "./shared"

export function HistoryPanel({
  generations,
  onOpen,
}: {
  generations: GenDTO[]
  onOpen?: (id: string) => void
}) {
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  if (generations.length === 0) {
    return <p className="text-sm text-muted-foreground">No saved communications yet.</p>
  }

  return (
    <div className="max-w-3xl space-y-2">
      {generations.map((g) => {
        const label = CONTENT_TYPE_LABELS[g.type as ContentType] ?? g.type
        const open = openId === g.id
        return (
          <div key={g.id} className="rounded-xl border border-border bg-white">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <button
                onClick={() => setOpenId(open ? null : g.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                {open ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 truncate">
                  <span className="text-sm font-medium text-[#1a1a2e]">
                    {CONTENT_TYPE_ICONS[g.type as ContentType] ?? ""} {g.title || label}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {label} · {new Date(g.createdAt).toLocaleDateString()}
                  </span>
                </span>
              </button>
              {onOpen && (
                <button
                  onClick={() => onOpen(g.id)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1b3a6b] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1b3a6b]/90"
                >
                  <Wand2 className="h-3.5 w-3.5" /> Refine
                </button>
              )}
            </div>
            {open && (
              <div className="border-t border-border p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-[#1a1a2e]">
                  {g.content}
                </pre>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(g.content)
                      setCopiedId(g.id)
                      setTimeout(() => setCopiedId(null), 1500)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-[#1a1a2e]"
                  >
                    {copiedId === g.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedId === g.id ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={async () => {
                      await deleteGeneration(g.id)
                      router.refresh()
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                  <span className="ml-auto text-xs text-muted-foreground">{g.model}</span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
