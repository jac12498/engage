# Block-based Newsletter — Plan

**Status:** 📋 Planning → building (2026-07-31). Goal: restructure newsletters as a
block-composed "1-page email," mirroring the Website builder's authoring model.

## Decisions (with Jeff)
- **Campaign-level template + per-issue content.** Header, Footer, and theme (colors/
  font/width) are set once per campaign and reused across every issue; each issue edits
  only its content blocks. Footer keeps the CAN-SPAM committee + address + unsubscribe locked.
- **Manual block editor + email renderer first.** AI block-generation is a fast-follow
  (extend the existing `generateNewsletterDraft` to emit blocks).

## The key constraint: email HTML ≠ web HTML
Reuse the Website's **authoring UX** (block list, props form, reorder, preview) — NOT its
renderers. Email needs table-based layout, fully inlined CSS, explicit widths, ~600px
container, and email-client quirks (Outlook/Word engine, Gmail). So we build a dedicated
`renderEmail(template, blocks, ctx)`; the editor preview renders that same HTML in an iframe
(one renderer, used for preview and send).

## Data model
- `Newsletter.blocks Json` — ordered `[{ id, type, props }]` content blocks (replaces the
  plain-text `body`; `body` kept for legacy migration).
- `Campaign.newsletterTemplate Json?` — `{ theme, header, footer }` shared across issues.
- Migration: legacy newsletters with `body` and no `blocks` → convert to one `text` block
  (lazy, on first edit) so existing issues keep working.

## Block registry (`src/lib/newsletter/blocks.ts`, pure, mirrors website blocks.ts)
Content block types (per issue): **heading, text, image, button (CTA), divider.**
Template (campaign): **header** (logo/committee, optional headshot), **footer** (signoff +
locked CAN-SPAM committee/address/unsubscribe), **theme** (primary/accent color, font,
content width). Each type: `defaultProps` + `validate` sanitizer (str/optStr/safeHref), same
security boundary as the website registry.

## Email renderer (`src/lib/newsletter/renderEmail.ts`)
`render(template, blocks, ctx)` → email-safe HTML: 600px centered table, inline styles,
header + blocks + footer, themed. Used by the editor preview AND `sendNewsletterNow`.

## Build phases
- **1a Foundation (this pass):** schema + migration, block registry, email renderer, wire
  `newsletterSend.ts` to render from blocks (fallback to legacy body), a default template.
- **1b Editor UI:** block-list editor (add/reorder/delete + props form) + iframe preview on
  `/newsletters/[id]`; subject/preview fields retained.
- **1c Template editor:** campaign template page (`/newsletters/template`) for header/footer/
  theme; add it as a Newsletter sidebar sub-section.
- **2 AI fast-follow:** `generateNewsletterDraft` emits blocks; optional AI "compose" in editor.

## Reuse vs. new
- Reuse patterns from `WebsiteBuilder` / `BlockPropsForm` / `blockService` (block list, props
  editing, reorder) and the registry shape from `lib/website/blocks.ts`.
- New: newsletter block registry, **email renderer**, blocks data model, campaign template.
