"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteContextItem } from "@/app/communications/actions"
import { type ContextDTO } from "./shared"
import { ContextForm, CONTEXT_TYPE_LABEL, type CtxType, type TopicRef } from "./ContextForm"

const FILTERS: { id: "all" | CtxType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "position", label: "Positions" },
  { id: "reference", label: "References" },
  { id: "note", label: "Notes" },
]

export function ContextManager({
  contextItems,
  topics,
}: {
  contextItems: ContextDTO[]
  topics: TopicRef[]
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<"all" | CtxType>("all")
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)

  const topicName = (id: string | null) =>
    id ? (topics.find((t) => t.id === id)?.title ?? "Topic") : null

  const shown = filter === "all" ? contextItems : contextItems.filter((c) => c.type === filter)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Context</h1>
        <p className="mt-1 text-muted-foreground">
          Everything that grounds your writing. Each item is a <strong>Note</strong>,{" "}
          <strong>Position</strong>, or <strong>Reference</strong>, and applies either to{" "}
          <strong>every</strong> draft (General) or only when you write on a specific{" "}
          <strong>Topic</strong>.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-white p-1 text-sm">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                filter === f.id ? "bg-[#1b3a6b] text-white" : "text-muted-foreground hover:text-[#1a1a2e]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {!adding && (
          <Button variant="outline" onClick={() => setAdding(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Add context
          </Button>
        )}
      </div>

      {adding && (
        <div className="rounded-xl border border-border bg-white p-4">
          <ContextForm
            topics={topics}
            onDone={() => {
              setAdding(false)
              router.refresh()
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {shown.length === 0 && !adding && (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nothing here yet. Add a position, a reference, or a background note — General or tied to a
          topic.
        </p>
      )}

      <div className="space-y-3">
        {shown.map((item) =>
          editing === item.id ? (
            <div key={item.id} className="rounded-xl border border-border bg-white p-4">
              <ContextForm
                initial={item}
                topics={topics}
                onDone={() => {
                  setEditing(null)
                  router.refresh()
                }}
                onCancel={() => setEditing(null)}
              />
            </div>
          ) : (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-white p-4"
            >
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#1a1a2e]/[0.06] px-2 py-0.5 text-xs font-medium text-[#1a1a2e]">
                    {CONTEXT_TYPE_LABEL[(item.type as CtxType) ?? "note"] ?? "Note"}
                  </span>
                  {item.type === "reference" && item.refType && (
                    <span className="rounded-full bg-[#1a1a2e]/[0.06] px-2 py-0.5 text-xs text-muted-foreground">
                      {item.refType === "document" ? "PDF" : item.refType === "website" ? "Website" : "URL"}
                    </span>
                  )}
                  {item.topicId ? (
                    <span className="rounded-full bg-[#1b3a6b]/10 px-2 py-0.5 text-xs font-medium text-[#1b3a6b]">
                      {topicName(item.topicId)}
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#1e6b3a]/10 px-2 py-0.5 text-xs font-medium text-[#1e6b3a]">
                      General
                    </span>
                  )}
                  {item.title && (
                    <span className="text-sm font-semibold text-[#1a1a2e]">
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noreferrer" className="hover:underline">
                          {item.title}
                        </a>
                      ) : (
                        item.title
                      )}
                    </span>
                  )}
                  {item.source && <span className="text-xs text-muted-foreground">· {item.source}</span>}
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.body}</p>
                {item.keyPoints.length > 0 && (
                  <ul className="mt-2 list-disc space-y-0.5 pl-4 text-sm text-[#1a1a2e]">
                    {item.keyPoints.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => setEditing(item.id)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-[#1a1a2e]"
                >
                  Edit
                </button>
                <button
                  onClick={async () => {
                    await deleteContextItem(item.id)
                    router.refresh()
                  }}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
