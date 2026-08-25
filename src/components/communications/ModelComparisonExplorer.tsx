"use client"

import { useState } from "react"
import { FORMAT_EXAMPLES, MODELS } from "@/app/ai/models/samples"

const MODEL_BY_ID = Object.fromEntries(MODELS.map((m) => [m.id, m]))

export function ModelComparisonExplorer({ initialFormat }: { initialFormat?: string }) {
  const validInitial = FORMAT_EXAMPLES.some((f) => f.key === initialFormat)
    ? (initialFormat as string)
    : FORMAT_EXAMPLES[0].key
  const [activeKey, setActiveKey] = useState(validInitial)
  const active = FORMAT_EXAMPLES.find((f) => f.key === activeKey) ?? FORMAT_EXAMPLES[0]

  function selectFormat(key: string) {
    setActiveKey(key)
    // Keep the URL shareable/bookmarkable without a server round-trip.
    window.history.replaceState(null, "", `?format=${key}`)
  }

  return (
    <div className="space-y-5">
      {/* Format tabs */}
      <div className="flex flex-wrap gap-2">
        {FORMAT_EXAMPLES.map((f) => {
          const on = f.key === activeKey
          return (
            <button
              key={f.key}
              onClick={() => selectFormat(f.key)}
              className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                on
                  ? "border-[#1b3a6b] bg-[#1b3a6b] font-medium text-white"
                  : "border-border bg-white text-[#1a1a2e] hover:border-[#1b3a6b]/40"
              }`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* The shared prompt for this format */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {active.blurb} — the same prompt to all three
        </p>
        <blockquote className="rounded-xl border-l-4 border-[#1b3a6b]/30 bg-white p-4 text-sm italic leading-relaxed text-[#1a1a2e]">
          “{active.prompt}”
        </blockquote>
      </div>

      {/* One card per model */}
      <div className="space-y-4">
        {active.samples.map((s) => {
          const model = MODEL_BY_ID[s.modelId]
          return (
            <div
              key={s.modelId}
              className="overflow-hidden rounded-2xl border border-border bg-white"
            >
              <div className="flex items-center justify-between border-b border-border bg-[#f4f6f9] px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <h3 className="font-semibold text-[#1a1a2e]">{model?.name ?? s.modelId}</h3>
                  {model && (
                    <span className="rounded-full bg-[#1b3a6b]/8 px-2.5 py-0.5 text-xs font-semibold text-[#1b3a6b]">
                      {model.credits} credit{model.credits > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">~{s.approxWords} words</span>
              </div>
              <p className="whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed text-[#1a1a2e]">
                {s.text}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
