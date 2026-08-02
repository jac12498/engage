"use client"

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Trash2,
  ExternalLink,
  Check,
  Send,
  Plus,
  ArrowUp,
  ArrowDown,
  Upload,
  ChevronDown,
  ChevronRight,
  Newspaper,
  Ungroup,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SELECTABLE_AI_MODELS } from "@/lib/entitlements"
import { NL_BLOCK_SPECS, NL_BLOCK_ORDER, type NlBlockType } from "@/lib/newsletter/blocks"
import { NL_SNIPPETS, nlSnippet } from "@/lib/newsletter/snippets"
import { renderNewsletterEmail, type EmailRenderCtx } from "@/lib/newsletter/renderEmail"
import type { NewsletterTemplate } from "@/lib/newsletter/template"
import {
  updateNewsletter,
  draftNewsletter,
  publishNewsletter,
  unpublishNewsletter,
  deleteNewsletter,
  sendNewsletter,
  sendTestNewsletter,
  saveAsPreset,
} from "@/app/newsletters/actions"

type Props = Record<string, string>
interface EditorBlock {
  id: string
  type: NlBlockType
  props: Props
  /** Contiguous blocks sharing a groupId form one Article-style unit. */
  groupId?: string
}
interface EditorCampaign {
  candidateName: string
  committeeName: string | null
  headshotMime: string | null
  mailing: { street: string | null; street2: string | null; city: string | null; state: string | null; zip: string | null }
}
interface Editable {
  id: string
  subject: string
  preview: string
  blocks: { id: string; type: NlBlockType; props: unknown; groupId?: string }[]
  status: string
  publishedAt: string | null
  sentAt: string | null
  recipientCount: number | null
}

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"

const genId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "b" + Math.random().toString(36).slice(2)

const serializeBlocks = (blocks: EditorBlock[]) =>
  blocks.map((b) => ({ id: b.id, type: b.type, props: b.props, groupId: b.groupId }))

/** A contiguous run of blocks: either one group (groupId set) or one lone block. */
interface Row {
  groupId: string | null
  start: number
  len: number
}
function computeRows(blocks: EditorBlock[]): Row[] {
  const rows: Row[] = []
  for (let i = 0; i < blocks.length; i++) {
    const g = blocks[i].groupId ?? null
    const prev = rows[rows.length - 1]
    if (g && prev && prev.groupId === g) prev.len++
    else rows.push({ groupId: g, start: i, len: 1 })
  }
  return rows
}
/** Swap the row starting at `start` with its neighbor in `dir`, moving the whole run. */
function moveSlice(blocks: EditorBlock[], start: number, dir: -1 | 1): EditorBlock[] {
  const rows = computeRows(blocks)
  const idx = rows.findIndex((r) => r.start === start)
  const swap = idx + dir
  if (idx < 0 || swap < 0 || swap >= rows.length) return blocks
  const a = rows[Math.min(idx, swap)]
  const b = rows[Math.max(idx, swap)]
  return [
    ...blocks.slice(0, a.start),
    ...blocks.slice(b.start, b.start + b.len),
    ...blocks.slice(a.start, a.start + a.len),
    ...blocks.slice(b.start + b.len),
  ]
}

export function NewsletterEditor({
  campaignId,
  sitePublished,
  defaultModel,
  activeSubscribers,
  hasMailingAddress,
  campaign,
  template,
  newsletter,
}: {
  campaignId: string
  sitePublished: boolean
  defaultModel: string
  activeSubscribers: number
  hasMailingAddress: boolean
  campaign: EditorCampaign
  template: NewsletterTemplate
  newsletter: Editable
}) {
  const router = useRouter()
  const [subject, setSubject] = useState(newsletter.subject)
  const [preview, setPreview] = useState(newsletter.preview)
  const [blocks, setBlocks] = useState<EditorBlock[]>(
    newsletter.blocks.map((b) => ({ id: b.id, type: b.type, props: { ...(b.props as Props) }, groupId: b.groupId }))
  )
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [instruction, setInstruction] = useState("")
  const [model, setModel] = useState(defaultModel)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [origin, setOrigin] = useState("")

  useEffect(() => setOrigin(window.location.origin), [])

  const [saving, startSave] = useTransition()
  const [drafting, startDraft] = useTransition()
  const [pub, startPub] = useTransition()
  const [deleting, startDelete] = useTransition()
  const [sending, startSend] = useTransition()
  const [testing, startTest] = useTransition()
  const busy = saving || drafting || pub || deleting || sending || testing

  const published = newsletter.status === "published"
  const sent = Boolean(newsletter.sentAt)
  const publicUrl = `/websites/${campaignId}/newsletter/${newsletter.id}`

  // ─── Block ops ───
  function addBlock(type: NlBlockType) {
    setBlocks((prev) => [...prev, { id: genId(), type, props: { ...(NL_BLOCK_SPECS[type].defaultProps() as Props) } }])
    setNotice(null)
  }
  /** Insert a group snippet (e.g. Article) as one run of primitives sharing a groupId. */
  function insertSnippet(key: string) {
    const snip = nlSnippet(key)
    if (!snip) return
    const groupId = genId()
    const added: EditorBlock[] = snip.blocks.map((sb) => ({
      id: genId(),
      type: sb.type,
      props: { ...(NL_BLOCK_SPECS[sb.type].defaultProps() as Props), ...(sb.props ?? {}) },
      groupId,
    }))
    setBlocks((prev) => [...prev, ...added])
    setNotice(null)
  }
  function updateProps(id: string, patch: Props) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...patch } } : b)))
  }
  /** Reorder a single block. Grouped blocks reorder only within their group;
   *  ungrouped blocks hop over the neighboring row (past a whole group as a unit). */
  function moveBlock(id: string, dir: -1 | 1) {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id)
      if (i < 0) return prev
      const b = prev[i]
      if (b.groupId) {
        const j = i + dir
        if (j < 0 || j >= prev.length || prev[j].groupId !== b.groupId) return prev
        const next = [...prev]
        ;[next[i], next[j]] = [next[j], next[i]]
        return next
      }
      return moveSlice(prev, i, dir)
    })
  }
  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }
  /** Move an entire group as one unit past its neighboring row. */
  function moveGroup(groupId: string, dir: -1 | 1) {
    setBlocks((prev) => {
      const row = computeRows(prev).find((r) => r.groupId === groupId)
      return row ? moveSlice(prev, row.start, dir) : prev
    })
  }
  /** Dissolve a group — its blocks stay in place but become individually movable. */
  function ungroup(groupId: string) {
    setBlocks((prev) => prev.map((b) => (b.groupId === groupId ? { ...b, groupId: undefined } : b)))
  }
  function removeGroup(groupId: string) {
    if (!confirm("Delete this article and all its blocks?")) return
    setBlocks((prev) => prev.filter((b) => b.groupId !== groupId))
  }
  function toggleCollapse(groupId: string) {
    setCollapsed((c) => ({ ...c, [groupId]: !c[groupId] }))
  }

  // ─── Live preview (client-side; renderEmail is a pure module) ───
  const previewHtml = useMemo(() => {
    const ctx: EmailRenderCtx = {
      subject,
      candidateName: campaign.candidateName,
      committeeName: campaign.committeeName,
      campaignId,
      mailing: campaign.mailing,
      unsubscribeUrl: "#",
      headshotUrl: campaign.headshotMime && origin ? `${origin}/api/website/headshot/${campaignId}` : null,
      baseUrl: origin,
    }
    return renderNewsletterEmail(template, blocks, ctx)
  }, [subject, blocks, template, campaign, campaignId, origin])

  // ─── Actions ───
  function save(after?: () => void) {
    setError(null)
    setNotice(null)
    startSave(async () => {
      const res = await updateNewsletter(newsletter.id, {
        subject,
        preview,
        blocks: serializeBlocks(blocks),
      })
      if (!res.ok) setError(res.error)
      else {
        setNotice("Saved.")
        if (after) after()
        else router.refresh()
      }
    })
  }

  function doDraft() {
    const text = instruction.trim()
    if (!text) return
    if (blocks.length > 0 && !confirm("Replace the current content with an AI draft?")) return
    setError(null)
    setNotice(null)
    startDraft(async () => {
      const res = await draftNewsletter(text, model)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setSubject(res.draft.subject)
      setPreview(res.draft.preview)
      setBlocks(res.draft.blocks.map((b) => ({ id: genId(), type: b.type, props: { ...(b.props as Props) } })))
      setNotice("Draft ready — edit the blocks, then Save.")
    })
  }

  function togglePublish() {
    setError(null)
    setNotice(null)
    startPub(async () => {
      if (published) {
        const res = await unpublishNewsletter(newsletter.id)
        if (!res.ok) setError(res.error)
        else {
          setNotice("Moved back to draft.")
          router.refresh()
        }
        return
      }
      const saved = await updateNewsletter(newsletter.id, {
        subject,
        preview,
        blocks: serializeBlocks(blocks),
      })
      if (!saved.ok) {
        setError(saved.error)
        return
      }
      const res = await publishNewsletter(newsletter.id)
      if (!res.ok) setError(res.error)
      else {
        setNotice("Published to your archive.")
        router.refresh()
      }
    })
  }

  function doSaveAsPreset() {
    const name = window.prompt("Name this template (saves the branding + this layout to reuse):")
    if (!name?.trim()) return
    setError(null)
    setNotice(null)
    startSave(async () => {
      const saved = await updateNewsletter(newsletter.id, {
        subject,
        preview,
        blocks: serializeBlocks(blocks),
      })
      if (!saved.ok) {
        setError(saved.error)
        return
      }
      const res = await saveAsPreset(newsletter.id, name.trim())
      if (!res.ok) setError(res.error)
      else setNotice(`Saved as template “${name.trim()}”.`)
    })
  }

  function doTest() {
    setError(null)
    setNotice(null)
    startTest(async () => {
      // Save current edits first so the test reflects what's on screen.
      const saved = await updateNewsletter(newsletter.id, {
        subject,
        preview,
        blocks: serializeBlocks(blocks),
      })
      if (!saved.ok) {
        setError(saved.error)
        return
      }
      const res = await sendTestNewsletter(newsletter.id)
      if (!res.ok) setError(res.error)
      else setNotice(`Test sent to ${res.to} — check your inbox.`)
    })
  }

  function doSend() {
    if (!confirm(`Email this newsletter to ${activeSubscribers} confirmed subscriber${activeSubscribers === 1 ? "" : "s"}? This can't be undone.`)) return
    setError(null)
    setNotice(null)
    startSend(async () => {
      const res = await sendNewsletter(newsletter.id)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setNotice(res.failed > 0 ? `Sent to ${res.sent} of ${res.total} (${res.failed} failed).` : `Sent to ${res.sent} subscriber${res.sent === 1 ? "" : "s"}.`)
      router.refresh()
    })
  }

  function remove() {
    if (!confirm("Delete this newsletter permanently?")) return
    setError(null)
    startDelete(async () => {
      const res = await deleteNewsletter(newsletter.id)
      if (!res.ok) setError(res.error)
      else router.push("/newsletters")
    })
  }

  return (
    <div>
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/newsletters" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e]">
          <ArrowLeft className="h-4 w-4" /> All newsletters
        </Link>
        <div className="flex items-center gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${published ? "bg-[#1e6b3a]/10 text-[#1e6b3a]" : "bg-[#c4910a]/15 text-[#7a5a00]"}`}>
            {newsletter.status}
          </span>
          {published && sitePublished && (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-[#c4910a] hover:underline">
              View in archive <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <button onClick={remove} disabled={busy} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50" aria-label="Delete newsletter">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {notice && <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#1e6b3a]/25 bg-[#1e6b3a]/8 px-4 py-2.5 text-sm text-[#1e6b3a]"><Check className="h-4 w-4" /> {notice}</p>}
      {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Editor column */}
        <div className="space-y-5">
          {/* AI draft */}
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="inline-flex items-center gap-2 font-semibold text-[#1a1a2e]"><Sparkles className="h-4 w-4 text-[#c4910a]" /> Draft with AI</div>
            <p className="mt-1 text-sm text-muted-foreground">Describe what to cover and I&apos;ll draft it in your voice as a starting text block. Uses one generation.</p>
            <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={2} placeholder="e.g. A recap of the town hall, plus a canvass invite" disabled={busy} className={`mt-3 ${inputCls} resize-none`} />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button onClick={doDraft} disabled={busy || !instruction.trim()}>
                {drafting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                {drafting ? "Drafting…" : "Draft with AI"}
              </Button>
              <select value={model} onChange={(e) => setModel(e.target.value)} disabled={busy} className="rounded-md border border-border bg-white px-2 py-1.5 text-xs text-muted-foreground outline-none">
                {SELECTABLE_AI_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          {/* Subject / preview */}
          <div className="space-y-4 rounded-2xl border border-border bg-white p-5">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">Newsletter Title</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Shown in the inbox and as the archive page title" className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">Newsletter Preview</span>
              <input value={preview} onChange={(e) => setPreview(e.target.value)} placeholder="Short teaser for the inbox preview (optional)" className={inputCls} />
            </label>
          </div>

          {/* Blocks */}
          <div className="space-y-3">
            {computeRows(blocks).map((row, ri, rows) => {
              const rowBlocks = blocks.slice(row.start, row.start + row.len)
              if (row.groupId) {
                const gid = row.groupId
                const isCollapsed = collapsed[gid] ?? false
                return (
                  <GroupCard
                    key={gid}
                    label={groupLabel(rowBlocks)}
                    count={rowBlocks.length}
                    collapsed={isCollapsed}
                    first={ri === 0}
                    last={ri === rows.length - 1}
                    onToggle={() => toggleCollapse(gid)}
                    onMove={(d) => moveGroup(gid, d)}
                    onUngroup={() => ungroup(gid)}
                    onRemove={() => removeGroup(gid)}
                  >
                    {rowBlocks.map((b, bi) => (
                      <BlockCard key={b.id} block={b} first={bi === 0} last={bi === rowBlocks.length - 1} onChange={(patch) => updateProps(b.id, patch)} onMove={(d) => moveBlock(b.id, d)} onRemove={() => removeBlock(b.id)} />
                    ))}
                  </GroupCard>
                )
              }
              const b = rowBlocks[0]
              return (
                <BlockCard key={b.id} block={b} first={ri === 0} last={ri === rows.length - 1} onChange={(patch) => updateProps(b.id, patch)} onMove={(d) => moveBlock(b.id, d)} onRemove={() => removeBlock(b.id)} />
              )
            })}
            {blocks.length === 0 && <p className="rounded-xl border border-dashed border-border bg-white/60 px-4 py-6 text-center text-sm text-muted-foreground">No content yet. Insert an Article or add a block below.</p>}

            {/* Insert group snippets */}
            <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-white p-3">
              <span className="mr-1 inline-flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Insert:</span>
              {NL_SNIPPETS.map((s) => (
                <button key={s.key} onClick={() => insertSnippet(s.key)} disabled={busy} title={s.description} className="inline-flex items-center gap-1 rounded-lg border border-[#1b3a6b]/40 bg-[#1b3a6b]/4 px-2.5 py-1.5 text-sm font-medium text-[#1a1a2e] transition-colors hover:border-[#1b3a6b]/70 disabled:opacity-50">
                  <Newspaper className="h-3.5 w-3.5 text-[#1b3a6b]" /> {s.label}
                </button>
              ))}
            </div>

            {/* Palette */}
            <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-white p-3">
              <span className="mr-1 inline-flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add:</span>
              {NL_BLOCK_ORDER.map((type) => (
                <button key={type} onClick={() => addBlock(type)} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium text-[#1a1a2e] transition-colors hover:border-[#1b3a6b]/40 disabled:opacity-50">
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" /> {NL_BLOCK_SPECS[type].label}
                </button>
              ))}
            </div>
          </div>

          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => save()} disabled={busy}>{saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Save</Button>
            <Button variant={published ? "outline" : "default"} onClick={togglePublish} disabled={busy}>{pub ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}{published ? "Unpublish" : "Save & publish"}</Button>
            <Button variant="outline" onClick={doTest} disabled={busy || blocks.length === 0}>
              {testing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
              Send test to me
            </Button>
            <Button variant="ghost" onClick={doSaveAsPreset} disabled={busy || blocks.length === 0}>
              Save as template
            </Button>
          </div>

          {/* Send */}
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="inline-flex items-center gap-2 font-semibold text-[#1a1a2e]"><Send className="h-4 w-4 text-[#1b3a6b]" /> Email to subscribers</div>
            {sent ? (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#1e6b3a]/25 bg-[#1e6b3a]/8 px-4 py-2.5 text-sm text-[#1e6b3a]">
                <Check className="h-4 w-4" /> Sent{newsletter.recipientCount != null ? ` to ${newsletter.recipientCount} subscribers` : ""} on {new Date(newsletter.sentAt!).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted-foreground">{published ? `Send to your ${activeSubscribers} confirmed subscriber${activeSubscribers === 1 ? "" : "s"}. It sends once — you can't unsend.` : "Publish first, then you can email it."}</p>
                {published && !hasMailingAddress && (
                  <p className="mt-3 rounded-lg border border-[#c4910a]/30 bg-[#f0b429]/10 px-4 py-2.5 text-sm text-[#7a5a00]">Add a mailing address in <Link href="/settings" className="font-medium underline">Settings</Link> before sending — required by law.</p>
                )}
                {published && hasMailingAddress && activeSubscribers === 0 && (
                  <p className="mt-3 rounded-lg border border-border bg-[#f4f6f9] px-4 py-2.5 text-sm text-muted-foreground">No confirmed subscribers yet.</p>
                )}
                <div className="mt-3">
                  <Button onClick={doSend} disabled={busy || !published || !hasMailingAddress || activeSubscribers === 0}>
                    {sending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
                    {sending ? "Sending…" : `Send to ${activeSubscribers} subscriber${activeSubscribers === 1 ? "" : "s"}`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Preview column */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live preview</p>
          <iframe title="Newsletter preview" srcDoc={previewHtml} className="h-[70vh] w-full rounded-2xl border border-border bg-white" />
        </div>
      </div>
    </div>
  )
}

/** Article/group label — derived from the group's first non-empty heading. */
function groupLabel(groupBlocks: EditorBlock[]): string {
  const h = groupBlocks.find((b) => b.type === "heading" && (b.props.text ?? "").trim())
  return h ? (h.props.text as string).trim().slice(0, 60) : "Article"
}

function GroupCard({
  label,
  count,
  collapsed,
  first,
  last,
  onToggle,
  onMove,
  onUngroup,
  onRemove,
  children,
}: {
  label: string
  count: number
  collapsed: boolean
  first: boolean
  last: boolean
  onToggle: () => void
  onMove: (dir: -1 | 1) => void
  onUngroup: () => void
  onRemove: () => void
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-[#1b3a6b]/25 bg-[#1b3a6b]/3 p-3">
      <div className="flex items-center justify-between gap-2">
        <button onClick={onToggle} className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-[#1a1a2e]">
          {collapsed ? <ChevronRight className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
          <Newspaper className="h-4 w-4 shrink-0 text-[#1b3a6b]" />
          <span className="truncate">{label}</span>
          <span className="shrink-0 text-xs font-normal text-muted-foreground">· {count} block{count === 1 ? "" : "s"}</span>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => onMove(-1)} disabled={first} className="rounded p-1 text-muted-foreground hover:bg-white disabled:opacity-30" aria-label="Move article up"><ArrowUp className="h-4 w-4" /></button>
          <button onClick={() => onMove(1)} disabled={last} className="rounded p-1 text-muted-foreground hover:bg-white disabled:opacity-30" aria-label="Move article down"><ArrowDown className="h-4 w-4" /></button>
          <button onClick={onUngroup} className="rounded p-1 text-muted-foreground hover:bg-white" aria-label="Ungroup" title="Ungroup — keep the blocks, drop the article grouping"><Ungroup className="h-4 w-4" /></button>
          <button onClick={onRemove} className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label="Delete article" title="Delete the article and its blocks"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      {!collapsed && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  )
}

function BlockCard({
  block,
  first,
  last,
  onChange,
  onMove,
  onRemove,
}: {
  block: EditorBlock
  first: boolean
  last: boolean
  onChange: (patch: Props) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-[#1a1a2e]">{NL_BLOCK_SPECS[block.type].label}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => onMove(-1)} disabled={first} className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30" aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
          <button onClick={() => onMove(1)} disabled={last} className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30" aria-label="Move down"><ArrowDown className="h-4 w-4" /></button>
          <button onClick={onRemove} className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label="Delete block"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      <BlockFields block={block} onChange={onChange} />
    </div>
  )
}

function BlockFields({ block, onChange }: { block: EditorBlock; onChange: (patch: Props) => void }) {
  const p = block.props
  switch (block.type) {
    case "heading":
      return <input value={p.text ?? ""} onChange={(e) => onChange({ text: e.target.value })} placeholder="Heading text" className={inputCls} />
    case "text":
      return <textarea value={p.body ?? ""} onChange={(e) => onChange({ body: e.target.value })} rows={5} placeholder="Write your text… Blank line between paragraphs." className={`${inputCls} resize-y leading-relaxed`} />
    case "image":
      return <ImageField props={p} onChange={onChange} />
    case "button":
      return (
        <div className="space-y-2">
          <input value={p.label ?? ""} onChange={(e) => onChange({ label: e.target.value })} placeholder="Button label (e.g. Donate)" className={inputCls} />
          <input value={p.href ?? ""} onChange={(e) => onChange({ href: e.target.value })} placeholder="Button link (https://…)" className={inputCls} />
          <select value={p.align ?? "center"} onChange={(e) => onChange({ align: e.target.value })} className={inputCls}>
            <option value="left">Align left</option>
            <option value="center">Align center</option>
            <option value="right">Align right</option>
          </select>
        </div>
      )
    case "divider":
      return <p className="text-sm text-muted-foreground">A horizontal divider — no options.</p>
    case "spacer":
      return (
        <select value={p.size ?? "medium"} onChange={(e) => onChange({ size: e.target.value })} className={inputCls}>
          <option value="small">Small gap</option>
          <option value="medium">Medium gap</option>
          <option value="large">Large gap</option>
        </select>
      )
    case "twoColumn":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <textarea value={p.left ?? ""} onChange={(e) => onChange({ left: e.target.value })} rows={4} placeholder="Left column text" className={`${inputCls} resize-y`} />
          <textarea value={p.right ?? ""} onChange={(e) => onChange({ right: e.target.value })} rows={4} placeholder="Right column text" className={`${inputCls} resize-y`} />
        </div>
      )
    case "social":
      return (
        <div className="space-y-2">
          <input value={p.facebook ?? ""} onChange={(e) => onChange({ facebook: e.target.value })} placeholder="Facebook URL" className={inputCls} />
          <input value={p.x ?? ""} onChange={(e) => onChange({ x: e.target.value })} placeholder="X (Twitter) URL" className={inputCls} />
          <input value={p.instagram ?? ""} onChange={(e) => onChange({ instagram: e.target.value })} placeholder="Instagram URL" className={inputCls} />
          <input value={p.youtube ?? ""} onChange={(e) => onChange({ youtube: e.target.value })} placeholder="YouTube URL" className={inputCls} />
          <input value={p.website ?? ""} onChange={(e) => onChange({ website: e.target.value })} placeholder="Website URL" className={inputCls} />
        </div>
      )
    case "quote":
      return (
        <div className="space-y-2">
          <textarea value={p.text ?? ""} onChange={(e) => onChange({ text: e.target.value })} rows={3} placeholder="Quote or callout text" className={`${inputCls} resize-y`} />
          <input value={p.attribution ?? ""} onChange={(e) => onChange({ attribution: e.target.value })} placeholder="Attribution (optional) — e.g. a supporter's name" className={inputCls} />
        </div>
      )
    default:
      return null
  }
}

function ImageField({ props, onChange }: { props: Props; onChange: (patch: Props) => void }) {
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    setErr(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/newsletter/image", { method: "POST", body: fd })
      if (!res.ok) {
        setErr((await res.text()) || "Upload failed.")
        return
      }
      const { url } = (await res.json()) as { url: string }
      onChange({ src: url })
    } catch {
      setErr("Upload failed.")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input value={props.src ?? ""} onChange={(e) => onChange({ src: e.target.value })} placeholder="Image URL, or upload →" className={inputCls} />
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f) }} />
        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
      {props.src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.src} alt="" className="max-h-32 rounded border border-border object-contain" />
      )}
      <input value={props.alt ?? ""} onChange={(e) => onChange({ alt: e.target.value })} placeholder="Alt text (optional)" className={inputCls} />
      <input value={props.href ?? ""} onChange={(e) => onChange({ href: e.target.value })} placeholder="Link when clicked (optional)" className={inputCls} />
    </div>
  )
}
