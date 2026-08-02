// Block-group snippets — one insert action drops a pre-arranged run of PRIMITIVE
// blocks (not a new block type) into the newsletter, tagged with a shared groupId
// so the editor treats them as one collapsible/movable unit (e.g. an "Article").
//
// This is the whole-newsletter preset idea (lib/newsletter/presets.ts) applied one
// level down. Storage/render stay primitives-only; snippets are purely an authoring
// convenience. To add "Event details", "Endorsement", etc., append to NL_SNIPPETS.

import type { NlBlockType } from "./blocks"

export interface NlSnippetBlock {
  type: NlBlockType
  /** Optional prop overrides merged over the block's defaults. */
  props?: Record<string, string>
}
export interface NlSnippet {
  key: string
  label: string
  description: string
  blocks: NlSnippetBlock[]
}

export const NL_SNIPPETS: NlSnippet[] = [
  {
    key: "article",
    label: "Article",
    description: "A titled story — heading, hero image, body text, and a divider. Collapses and moves as one unit.",
    blocks: [{ type: "heading" }, { type: "image" }, { type: "text" }, { type: "divider" }],
  },
]

export function nlSnippet(key: string): NlSnippet | undefined {
  return NL_SNIPPETS.find((s) => s.key === key)
}
