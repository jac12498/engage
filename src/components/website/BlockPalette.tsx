"use client"

import { Plus, Sparkles } from "lucide-react"
import { BLOCK_GROUPS, BLOCK_SPECS, blockTypesForKind, type BlockKind } from "@/lib/website/blocks"

/**
 * The "Add section" picker — blocks grouped by kind (Content / Automatic / Forms).
 * Reused both to append at the end of a page and to insert between existing sections.
 */
export function BlockPalette({
  onPick,
  disabled,
}: {
  onPick: (type: string) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-4">
      {BLOCK_GROUPS.map((group) => {
        const types = blockTypesForKind(group.kind)
        if (types.length === 0) return null
        return (
          <div key={group.kind}>
            <div className="mb-2 flex items-baseline gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#1a1a2e]">
                {group.kind === "dynamic" && <Sparkles className="h-3.5 w-3.5 text-[#c4910a]" />}
                {group.label}
              </span>
              <span className="text-xs text-muted-foreground">{group.hint}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {types.map((t) => (
                <button
                  key={t}
                  onClick={() => onPick(t)}
                  disabled={disabled}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-[#1a1a2e] hover:border-[#1b3a6b]/40 hover:bg-muted/40 disabled:opacity-50"
                  title={BLOCK_SPECS[t].description}
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  {BLOCK_SPECS[t].label}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Small badge for a block's kind, shown on section cards. `content` returns null. */
export function KindBadge({ kind }: { kind: BlockKind }) {
  if (kind === "dynamic") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#c4910a]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8a6608]">
        <Sparkles className="h-3 w-3" /> Automatic
      </span>
    )
  }
  if (kind === "form") {
    return (
      <span className="inline-flex items-center rounded-full bg-[#1b3a6b]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1b3a6b]">
        Form
      </span>
    )
  }
  return null
}
