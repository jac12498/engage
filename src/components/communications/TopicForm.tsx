"use client"

import { useState, useTransition } from "react"
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { saveTopic } from "@/app/communications/actions"
import { inputCls, type TopicDTO } from "./shared"

export function TopicForm({
  initial,
  onDone,
  onCancel,
  saveLabel = "Save topic",
}: {
  initial?: TopicDTO
  onDone: () => void
  onCancel?: () => void
  saveLabel?: string
}) {
  const [title, setTitle] = useState(initial?.title ?? "")
  const [keyMessage, setKeyMessage] = useState(initial?.keyMessage ?? "")
  const [targetAudience, setTargetAudience] = useState(initial?.targetAudience ?? "")
  const [occasion, setOccasion] = useState(initial?.occasion ?? "")
  // Talking points as an ordered list (index = priority, most → least important).
  const [points, setPoints] = useState<string[]>(initial?.talkingPoints ?? [])
  const [newPoint, setNewPoint] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, start] = useTransition()

  function addPoint() {
    const v = newPoint.trim()
    if (!v) return
    setPoints((p) => [...p, v])
    setNewPoint("")
  }
  function removePoint(i: number) {
    setPoints((p) => p.filter((_, idx) => idx !== i))
  }
  function move(i: number, dir: -1 | 1) {
    setPoints((p) => {
      const j = i + dir
      if (j < 0 || j >= p.length) return p
      const next = [...p]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  function updatePoint(i: number, v: string) {
    setPoints((p) => p.map((x, idx) => (idx === i ? v : x)))
  }

  function submit() {
    setError(null)
    setSaved(false)
    start(async () => {
      const r = await saveTopic({
        id: initial?.id,
        title,
        keyMessage,
        targetAudience,
        occasion,
        talkingPoints: points,
      })
      if (r.ok) {
        setSaved(true)
        onDone()
      } else setError(r.error ?? "Could not save.")
    })
  }

  return (
    <div className="space-y-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Topic title (e.g. Rising property taxes)"
        className={inputCls}
      />
      <textarea
        value={keyMessage}
        onChange={(e) => setKeyMessage(e.target.value)}
        rows={2}
        placeholder="Key message — the one thing to land"
        className={inputCls}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          placeholder="Target audience (optional)"
          className={inputCls}
        />
        <input
          value={occasion}
          onChange={(e) => setOccasion(e.target.value)}
          placeholder="Occasion (optional)"
          className={inputCls}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
          Talking points{" "}
          <span className="font-normal text-muted-foreground">(ordered — most important first)</span>
        </label>
        {points.length > 0 && (
          <ul className="mb-2 space-y-1.5">
            {points.map((p, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <span className="w-5 shrink-0 text-right text-xs font-semibold text-muted-foreground">
                  {i + 1}.
                </span>
                <input value={p} onChange={(e) => updatePoint(i, e.target.value)} className={inputCls} />
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="text-muted-foreground hover:text-[#1a1a2e] disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === points.length - 1}
                    className="text-muted-foreground hover:text-[#1a1a2e] disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removePoint(i)}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input
            value={newPoint}
            onChange={(e) => setNewPoint(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addPoint()
              }
            }}
            placeholder="Add a talking point…"
            className={inputCls}
          />
          <Button type="button" variant="outline" onClick={addPoint} disabled={!newPoint.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <Button onClick={submit} disabled={pending || !title.trim()}>
          {pending ? "Saving…" : saved ? "Saved" : saveLabel}
        </Button>
        {onCancel && (
          <button onClick={onCancel} className="px-3 py-2 text-sm text-muted-foreground hover:text-[#1a1a2e]">
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
