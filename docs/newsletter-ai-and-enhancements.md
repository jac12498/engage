# Newsletter — AI authoring, block enhancements, and the AI model refresh (2026-08-09)

Status of the newsletter builder after the 2026-08 session. Builds on
`newsletter-plan.md` (P1–P3) and `newsletter-blocks-plan.md` (block foundation).
All changes are on `master` (github.com/jac12498/engage), tsc + `next build` green,
deployed to Railway (engageamplify.com).

## Block builder enhancements

- **Article sections + collapsible groups.** `NlBlock.groupId?` (optional) marks a
  *contiguous run* of blocks as one "Article". No nesting — both renderers
  (`renderEmail.ts`, `_render/NewsletterBlocks.tsx`) ignore `groupId`; grouping is
  purely an editor affordance. `lib/newsletter/snippets.ts` defines `NL_SNIPPETS`
  (Article = heading + image + text + divider). In the editor, **Insert Section →
  Article** drops a grouped run; a `GroupCard` renders the run as one collapsible
  card that moves / ungroups / deletes as a unit (group-aware move via
  `computeRows` / `moveSlice`). Each group has an **Add to article** palette
  (`addBlockToGroup`) and an **AI Assistance** wand.
- **Image + text (wrap) block** (`imageText`). Body text wraps around an image,
  `side` left/right. Web = CSS `float` (in an `overflow-hidden` container so it
  contains the float); email = `<img align>` (the one wrap technique that survives
  Outlook). Top-anchored left/right only — no vertical positioning (floats and
  email can't do it).
- **Issue title in the email body.** `renderTitle` prints the Newsletter Title as
  an `<h1>` below the masthead (it was previously only the inbox subject line and
  the archive page H1).
- **Editor layout** is a single top-down column: Live preview (scrollable, with an
  **Open full page** link that opens the current preview via a blob URL) →
  Newsletter Title (collapsible) → Create Article with AI (collapsible) → Content
  (collapsible) → Insert Section → Add Component → action buttons → Email to
  subscribers. `CollapsibleCard` is the shared wrapper.
- **Markdown inline links** in Text / Two-column / Image+text bodies:
  `[label](url)`. Parsed once in `lib/newsletter/blocks.ts` (`parseInlineLinks`,
  shared by both renderers) and sanitized with `safeHref` (http(s) or internal
  paths only); bare domains auto-get `https://`; a bad/unsafe URL keeps the literal
  `[label](url)` text so the author notices. Link color = template `primaryColor`
  (email) / `--site-primary` (web).
- **Subscribe link for forwarded readers.** Footer line "Was this forwarded to
  you? Subscribe…" → `/websites/[id]/newsletter#subscribe` (the double-opt-in
  form). `EmailRenderCtx.subscribeUrl` is populated **only when `site.published`**,
  because both the archive page and `POST /api/website/subscribe` return 404
  otherwise — so a forwarded reader never lands on a dead page. Wired through the
  real send, test send, and live preview.
  - **Known gap:** subscription still requires a published candidate website. A
    standalone no-website subscribe surface (e.g. `/n/[campaignId]`) is not built.

## AI article authoring (reuses the Communications engine)

The one-shot whole-newsletter drafter (`draftNewsletter` action +
`lib/website/newsletterDraft.ts`) was **removed** — it asked the model to invent
structure + copy + CTAs at once and couldn't be refined. Replaced with per-article
AI that reuses the Communications iterative loop.

- **`newsletter_article` ContentType + a "newsletter" `Medium`** in
  `lib/comms/prompts.ts`. Its prompt emits a headline line + 2–4 short body
  paragraphs, which map cleanly to a heading + text block. Home page at
  `/communications/newsletter` (a normal `MediumGenerator`), plus nav entry and the
  Overview media grid.
- **`ArticleAiPanel`** (`src/components/website/ArticleAiPanel.tsx`) streams from
  `/api/communications/generate` and `/revise`. Two modes:
  - *create* — describe → draft → refine → **Insert as article** (new Article
    group).
  - *assist* — **snapshot re-seed**: reads the group's current title+body, refine,
    then **Apply to article** writes back to the group's first heading + first text
    block only (images/buttons/other layout untouched). An empty freshly-inserted
    Article shows the describe→generate entry point too.
  - Optional **Topic** picker (same grounding the other generators get). The draft
    is editable prose (headline line + body); `RefineComments` "Comment on
    selection" works against the textarea.
- **`lib/newsletter/articleDraft.ts`** maps prose ↔ blocks
  (`parseArticleProse` / `articleProseFromBlocks`).
- **Bidirectional bridge (snapshots, not linked):**
  - **Save to Communications** (in the AI panel) persists the article as a
    `newsletter_article` `Generation` (`medium="newsletter"`) with its refine
    version chain. Explicit — nothing is auto-saved.
  - **From Communications** (editor Insert Section) lists saved newsletter-article
    generations (passed from the page) and inserts a chosen one as a new Article
    group.

## AI model refresh

See `memory: engagecampaign-ai-models` for the full reference. Summary:

- Selectable models are now **Haiku 4.5 / Sonnet 5 / Opus 5** (were Sonnet 4.6 /
  Opus 4.8); credit weights unchanged 1 / 3 / 5. `resolveModel` legacy-remaps old
  ids to their successors so stored preferences upgrade rather than drop to Haiku.
- **Thinking is disabled on the 5-series for short-form drafting**
  (`draftingThinking` in `lib/comms/prompts.ts`), because thinking is on by default
  on Opus 5 / Sonnet 5 and would eat the tight `max_tokens` and add a streaming
  pause. `buildSystemPrompt` gained an anti-`<thinking>`-tag line.
- Website module pinned to Sonnet 5 (`generate.ts`, `newsSearch.ts`; news search
  uses `web_search_20260209`). Model-comparison samples (`samples.ts`) regenerated
  as 12 verbatim outputs from the current three models.
