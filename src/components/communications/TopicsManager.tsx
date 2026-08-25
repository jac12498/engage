"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Lightbulb, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteTopic } from "@/app/communications/actions"
import { TopicForm } from "./TopicForm"
import { type TopicDTO } from "./shared"

export function TopicsManager({ topics }: { topics: TopicDTO[] }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Topics</h1>
          <p className="mt-1 text-muted-foreground">
            Hot topics you want to write about. Open one to edit it, add its context, and see what
            you&apos;ve generated.
          </p>
        </div>
        {!adding && (
          <Button variant="outline" onClick={() => setAdding(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New topic
          </Button>
        )}
      </div>

      {adding && (
        <div className="rounded-xl border border-border bg-white p-4">
          <TopicForm
            onDone={() => {
              setAdding(false)
              router.refresh()
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {topics.length === 0 && !adding && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          <Lightbulb className="mx-auto mb-2 h-7 w-7 opacity-40" />
          <p className="text-sm">No topics yet.</p>
          <p className="text-xs">Add a subject like &quot;Rising property taxes&quot; or &quot;Endorsement announcement.&quot;</p>
        </div>
      )}

      <div className="space-y-3">
        {topics.map((t) => (
          <div
            key={t.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-border bg-white p-4 transition-colors hover:border-[#1b3a6b]/40"
          >
            <Link href={`/settings/topics/${t.id}`} className="group min-w-0 flex-1">
              <h3 className="inline-flex items-center gap-1 font-semibold text-[#1a1a2e]">
                {t.title}
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </h3>
              {t.keyMessage && <p className="mt-0.5 text-sm text-muted-foreground">{t.keyMessage}</p>}
              <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                {t.targetAudience && <span>Audience: {t.targetAudience}</span>}
                {t.occasion && <span>Occasion: {t.occasion}</span>}
                {t.talkingPoints.length > 0 && <span>{t.talkingPoints.length} talking points</span>}
              </div>
            </Link>
            <button
              onClick={async () => {
                await deleteTopic(t.id)
                router.refresh()
              }}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
              aria-label="Delete topic"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
