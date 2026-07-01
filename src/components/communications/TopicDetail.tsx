"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2, Pencil, ChevronDown, ChevronRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteContextItem } from "@/app/communications/actions"
import { TopicForm } from "./TopicForm"
import { ContextForm, CONTEXT_TYPE_LABEL, type CtxType, type TopicRef } from "./ContextForm"
import { HistoryPanel } from "./HistoryPanel"
import { TopicGenerateDialog } from "./TopicGenerateDialog"
import { type PlanId } from "@/lib/entitlements"
import { type TopicDTO, type ContextDTO, type GenDTO } from "./shared"

export function TopicDetail({
  topic,
  topics,
  contextItems,
  generations,
  plan,
  generationsUsed,
}: {
  topic: TopicDTO
  topics: TopicRef[]
  contextItems: ContextDTO[]
  generations: GenDTO[]
  plan: PlanId
  generationsUsed: number
}) {
  const router = useRouter()
  const [editingTopic, setEditingTopic] = useState(false)
  const [addingCtx, setAddingCtx] = useState(false)
  const [editingCtx, setEditingCtx] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  // null = closed; { id: null } = new generation; { id } = refine that generation.
  const [dialog, setDialog] = useState<{ id: string | null } | null>(null)

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/communications/topics"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e]"
        >
          <ArrowLeft className="h-4 w-4" /> All topics
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#1a1a2e]">{topic.title}</h1>
      </div>

      {/* Topic — display, with Edit toggle */}
      <section className="rounded-2xl border border-border bg-white p-6">
        {editingTopic ? (
          <>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
              Edit topic
            </h2>
            <TopicForm
              initial={topic}
              saveLabel="Save changes"
              onDone={() => {
                setEditingTopic(false)
                router.refresh()
              }}
              onCancel={() => setEditingTopic(false)}
            />
          </>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              {topic.keyMessage && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Key message
                  </p>
                  <p className="text-sm text-[#1a1a2e]">{topic.keyMessage}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                {topic.targetAudience && (
                  <p>
                    <span className="text-muted-foreground">Audience:</span> {topic.targetAudience}
                  </p>
                )}
                {topic.occasion && (
                  <p>
                    <span className="text-muted-foreground">Occasion:</span> {topic.occasion}
                  </p>
                )}
              </div>
              {topic.talkingPoints.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Talking points
                  </p>
                  <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm text-[#1a1a2e]">
                    {topic.talkingPoints.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ol>
                </div>
              )}
              {!topic.keyMessage && !topic.targetAudience && !topic.occasion && topic.talkingPoints.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No details yet. Add a key message and talking points.
                </p>
              )}
            </div>
            <Button variant="outline" onClick={() => setEditingTopic(true)} className="shrink-0">
              <Pencil className="mr-1.5 h-4 w-4" /> Edit
            </Button>
          </div>
        )}
      </section>

      {/* Topic context — collapsed to top line */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#1a1a2e]">Context for this topic</h2>
            <p className="text-sm text-muted-foreground">Pulled in only when you write on this topic.</p>
          </div>
          {!addingCtx && (
            <Button variant="outline" onClick={() => setAddingCtx(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add context
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {addingCtx && (
            <div className="rounded-xl border border-border bg-white p-4">
              <ContextForm
                topics={topics}
                defaultTopicId={topic.id}
                onDone={() => {
                  setAddingCtx(false)
                  router.refresh()
                }}
                onCancel={() => setAddingCtx(false)}
              />
            </div>
          )}

          {contextItems.length === 0 && !addingCtx && (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No context yet for this topic. Add positions, references, or notes specific to it.
            </p>
          )}

          {contextItems.map((item) => {
            if (editingCtx === item.id) {
              return (
                <div key={item.id} className="rounded-xl border border-border bg-white p-4">
                  <ContextForm
                    initial={item}
                    topics={topics}
                    onDone={() => {
                      setEditingCtx(null)
                      router.refresh()
                    }}
                    onCancel={() => setEditingCtx(null)}
                  />
                </div>
              )
            }
            const isOpen = expanded.has(item.id)
            const topLine = item.title || item.body
            return (
              <div key={item.id} className="rounded-xl border border-border bg-white">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="shrink-0 rounded-full bg-[#1a1a2e]/[0.06] px-2 py-0.5 text-xs font-medium text-[#1a1a2e]">
                      {CONTEXT_TYPE_LABEL[(item.type as CtxType) ?? "note"] ?? "Note"}
                    </span>
                    {item.type === "reference" && item.refType && (
                      <span className="shrink-0 rounded-full bg-[#1a1a2e]/[0.06] px-2 py-0.5 text-xs text-muted-foreground">
                        {item.refType === "document" ? "PDF" : item.refType === "website" ? "Website" : "URL"}
                      </span>
                    )}
                    <span className="truncate text-sm font-medium text-[#1a1a2e]">{topLine}</span>
                  </button>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => setEditingCtx(item.id)}
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
                {isOpen && (
                  <div className="border-t border-border px-4 py-3">
                    {item.source && <p className="mb-1 text-xs text-muted-foreground">{item.source}</p>}
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.body}</p>
                    {item.keyPoints.length > 0 && (
                      <ul className="mt-2 list-disc space-y-0.5 pl-4 text-sm text-[#1a1a2e]">
                        {item.keyPoints.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    )}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs font-medium text-[#1b3a6b] hover:underline"
                      >
                        {item.url}
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Related generations */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1a1a2e]">Generated on this topic</h2>
          <Button onClick={() => setDialog({ id: null })}>
            <Sparkles className="mr-1.5 h-4 w-4" /> Generate
          </Button>
        </div>
        <HistoryPanel generations={generations} onOpen={(id) => setDialog({ id })} />
      </section>

      {dialog && (
        <TopicGenerateDialog
          topic={{ id: topic.id, title: topic.title }}
          plan={plan}
          generationsUsed={generationsUsed}
          initialGenerationId={dialog.id ?? undefined}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
