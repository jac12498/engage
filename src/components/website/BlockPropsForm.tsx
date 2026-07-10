"use client"

import { useState } from "react"
import { Loader2, Check, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { updateBlockProps } from "@/app/website/blocks-actions"
import { WEBSITE_NEWS_TYPES } from "@/lib/website/blocks"
import { CONTENT_TYPE_LABELS, type ContentType } from "@/lib/comms/prompts"

export interface EditorBlock {
  id: string
  type: string
  order: number
  props: Record<string, unknown>
}

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"

type Props = Record<string, unknown>
type Item = Record<string, unknown>

function s(v: unknown): string {
  return typeof v === "string" ? v : ""
}
function arr(v: unknown): Item[] {
  return Array.isArray(v) ? (v as Item[]) : []
}

// ─── Field primitives ────────────────────────────────────────────────────────

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </label>
  )
}

function AreaField({
  label,
  value,
  onChange,
  rows = 4,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
  hint?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className={inputCls} />
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

/** Edit an optional {label, href} CTA. */
function CtaField({
  title,
  cta,
  onChange,
}: {
  title: string
  cta: Item | undefined
  onChange: (cta: Item | undefined) => void
}) {
  const label = s(cta?.label)
  const href = s(cta?.href)
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-[#1a1a2e]">{title}</span>
        {(label || href) && (
          <button onClick={() => onChange(undefined)} className="text-xs text-muted-foreground hover:text-red-600">
            Clear
          </button>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={label}
          onChange={(e) => onChange({ label: e.target.value, href })}
          placeholder="Button label"
          className={inputCls}
        />
        <input
          value={href}
          onChange={(e) => onChange({ label, href: e.target.value })}
          placeholder="# anchor, /path, or https://…"
          className={inputCls}
        />
      </div>
    </div>
  )
}

/** Generic ordered list-of-items editor. `fields` renders one item's inputs. */
function ItemList({
  items,
  onChange,
  blank,
  addLabel,
  render,
}: {
  items: Item[]
  onChange: (items: Item[]) => void
  blank: Item
  addLabel: string
  render: (item: Item, set: (patch: Item) => void) => React.ReactNode
}) {
  function setAt(idx: number, patch: Item) {
    const next = items.slice()
    next[idx] = { ...next[idx], ...patch }
    onChange(next)
  }
  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir
    if (j < 0 || j >= items.length) return
    const next = items.slice()
    ;[next[idx], next[j]] = [next[j], next[idx]]
    onChange(next)
  }
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="rounded-xl border border-border p-3">
          <div className="mb-2 flex items-center justify-end gap-1">
            <button
              onClick={() => move(idx, -1)}
              disabled={idx === 0}
              className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
              title="Move up"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              onClick={() => move(idx, 1)}
              disabled={idx === items.length - 1}
              className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
              title="Move down"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
              title="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">{render(item, (patch) => setAt(idx, patch))}</div>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, { ...blank }])}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:border-[#1b3a6b]/40 hover:text-[#1a1a2e]"
      >
        <Plus className="h-4 w-4" /> {addLabel}
      </button>
    </div>
  )
}

// ─── Per-type fields ─────────────────────────────────────────────────────────

function Fields({ type, p, set }: { type: string; p: Props; set: (patch: Props) => void }) {
  switch (type) {
    case "hero":
      return (
        <>
          <TextField label="Headline" value={s(p.headline)} onChange={(v) => set({ headline: v })} />
          <AreaField label="Subheadline" value={s(p.subhead)} onChange={(v) => set({ subhead: v })} rows={2} />
          <label className="flex items-center gap-2 text-sm font-medium text-[#1a1a2e]">
            <input type="checkbox" checked={!!p.showHeadshot} onChange={(e) => set({ showHeadshot: e.target.checked })} />
            Show headshot
          </label>
          <CtaField title="Primary button" cta={p.primaryCta as Item} onChange={(cta) => set({ primaryCta: cta })} />
          <CtaField title="Secondary button" cta={p.secondaryCta as Item} onChange={(cta) => set({ secondaryCta: cta })} />
        </>
      )
    case "richText":
      return (
        <>
          <TextField label="Heading" value={s(p.heading)} onChange={(v) => set({ heading: v })} />
          <AreaField
            label="Body"
            value={s(p.body)}
            onChange={(v) => set({ body: v })}
            rows={7}
            hint="Separate paragraphs with a blank line."
          />
          <CtaField title="Button (optional)" cta={p.cta as Item} onChange={(cta) => set({ cta })} />
        </>
      )
    case "issuesGrid":
      return (
        <>
          <TextField label="Heading" value={s(p.heading)} onChange={(v) => set({ heading: v })} />
          <AreaField label="Intro" value={s(p.intro)} onChange={(v) => set({ intro: v })} rows={2} />
          <ItemList
            items={arr(p.items)}
            onChange={(items) => set({ items })}
            blank={{ title: "", body: "" }}
            addLabel="Add issue"
            render={(it, setIt) => (
              <>
                <input
                  value={s(it.title)}
                  onChange={(e) => setIt({ title: e.target.value })}
                  placeholder="Issue title"
                  className={`${inputCls} font-medium`}
                />
                <textarea
                  value={s(it.body)}
                  onChange={(e) => setIt({ body: e.target.value })}
                  rows={3}
                  placeholder="What you believe and will do."
                  className={inputCls}
                />
              </>
            )}
          />
        </>
      )
    case "volunteerForm":
      return (
        <>
          <TextField label="Heading" value={s(p.heading)} onChange={(v) => set({ heading: v })} />
          <AreaField
            label="Intro"
            value={s(p.intro)}
            onChange={(v) => set({ intro: v })}
            rows={2}
            hint="The signup form itself is added automatically."
          />
        </>
      )
    case "cta":
      return (
        <>
          <TextField label="Heading" value={s(p.heading)} onChange={(v) => set({ heading: v })} />
          <AreaField label="Text" value={s(p.text)} onChange={(v) => set({ text: v })} rows={2} />
          <div className="grid gap-2 sm:grid-cols-2">
            <TextField label="Button label" value={s(p.buttonLabel)} onChange={(v) => set({ buttonLabel: v })} />
            <TextField label="Button link" value={s(p.href)} onChange={(v) => set({ href: v })} placeholder="https://…" />
          </div>
        </>
      )
    case "endorsements":
      return (
        <>
          <TextField label="Heading" value={s(p.heading)} onChange={(v) => set({ heading: v })} />
          <AreaField label="Intro" value={s(p.intro)} onChange={(v) => set({ intro: v })} rows={2} />
          <ItemList
            items={arr(p.items)}
            onChange={(items) => set({ items })}
            blank={{ name: "", role: "", quote: "" }}
            addLabel="Add endorsement"
            render={(it, setIt) => (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={s(it.name)}
                    onChange={(e) => setIt({ name: e.target.value })}
                    placeholder="Name"
                    className={`${inputCls} font-medium`}
                  />
                  <input
                    value={s(it.role)}
                    onChange={(e) => setIt({ role: e.target.value })}
                    placeholder="Role / title (optional)"
                    className={inputCls}
                  />
                </div>
                <textarea
                  value={s(it.quote)}
                  onChange={(e) => setIt({ quote: e.target.value })}
                  rows={2}
                  placeholder="Quote (optional)"
                  className={inputCls}
                />
              </>
            )}
          />
        </>
      )
    case "newsFeed":
      return <NewsFeedFields p={p} set={set} />
    case "events":
      return (
        <>
          <TextField label="Heading" value={s(p.heading)} onChange={(v) => set({ heading: v })} />
          <AreaField label="Intro" value={s(p.intro)} onChange={(v) => set({ intro: v })} rows={2} />
          <ItemList
            items={arr(p.items)}
            onChange={(items) => set({ items })}
            blank={{ title: "", date: "", location: "", description: "" }}
            addLabel="Add event"
            render={(it, setIt) => (
              <>
                <input
                  value={s(it.title)}
                  onChange={(e) => setIt({ title: e.target.value })}
                  placeholder="Event title"
                  className={`${inputCls} font-medium`}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={s(it.date)}
                    onChange={(e) => setIt({ date: e.target.value })}
                    placeholder="Date (e.g. Sat, Aug 3)"
                    className={inputCls}
                  />
                  <input
                    value={s(it.location)}
                    onChange={(e) => setIt({ location: e.target.value })}
                    placeholder="Location"
                    className={inputCls}
                  />
                </div>
                <textarea
                  value={s(it.description)}
                  onChange={(e) => setIt({ description: e.target.value })}
                  rows={2}
                  placeholder="Description (optional)"
                  className={inputCls}
                />
              </>
            )}
          />
        </>
      )
    case "faq":
      return (
        <>
          <TextField label="Heading" value={s(p.heading)} onChange={(v) => set({ heading: v })} />
          <AreaField label="Intro" value={s(p.intro)} onChange={(v) => set({ intro: v })} rows={2} />
          <ItemList
            items={arr(p.items)}
            onChange={(items) => set({ items })}
            blank={{ q: "", a: "" }}
            addLabel="Add question"
            render={(it, setIt) => (
              <>
                <input
                  value={s(it.q)}
                  onChange={(e) => setIt({ q: e.target.value })}
                  placeholder="Question"
                  className={`${inputCls} font-medium`}
                />
                <textarea
                  value={s(it.a)}
                  onChange={(e) => setIt({ a: e.target.value })}
                  rows={3}
                  placeholder="Answer"
                  className={inputCls}
                />
              </>
            )}
          />
        </>
      )
    default:
      return <p className="text-sm text-muted-foreground">This block type has no editable fields.</p>
  }
}

function NewsFeedFields({ p, set }: { p: Props; set: (patch: Props) => void }) {
  const selected = new Set(Array.isArray(p.types) ? (p.types as string[]) : [])
  function toggle(t: string) {
    const next = new Set(selected)
    if (next.has(t)) next.delete(t)
    else next.add(t)
    set({ types: Array.from(next) })
  }
  const limit = typeof p.limit === "number" ? p.limit : 5
  return (
    <>
      <TextField label="Heading" value={s(p.heading)} onChange={(v) => set({ heading: v })} />
      <AreaField label="Intro" value={s(p.intro)} onChange={(v) => set({ intro: v })} rows={2} />
      <div>
        <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">Show these types</span>
        <div className="flex flex-wrap gap-2">
          {WEBSITE_NEWS_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => toggle(t)}
              className={`rounded-full border px-3 py-1 text-sm ${
                selected.has(t)
                  ? "border-[#1b3a6b] bg-[#1b3a6b]/10 text-[#1b3a6b]"
                  : "border-border text-muted-foreground hover:border-[#1b3a6b]/40"
              }`}
            >
              {CONTENT_TYPE_LABELS[t as ContentType] ?? t}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Only published pieces of these types appear. Publish a piece from AI Communications to show it here.
        </p>
      </div>
      <label className="block max-w-[10rem]">
        <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">Max items</span>
        <input
          type="number"
          min={1}
          max={20}
          value={limit}
          onChange={(e) => set({ limit: Number(e.target.value) })}
          className={inputCls}
        />
      </label>
    </>
  )
}

// ─── Form wrapper ────────────────────────────────────────────────────────────

export function BlockPropsForm({ block, onSaved }: { block: EditorBlock; onSaved: () => void }) {
  const [props, setProps] = useState<Props>(() => ({ ...block.props }))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(patch: Props) {
    setProps((prev) => ({ ...prev, ...patch }))
    setDirty(true)
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError(null)
    const res = await updateBlockProps(block.id, props)
    setSaving(false)
    if (res.ok) {
      setDirty(false)
      setSaved(true)
      onSaved()
    } else {
      setError(res.error)
    }
  }

  return (
    <div className="space-y-3">
      <Fields type={block.type} p={props} set={set} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={!dirty || saving}>
          {saving ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…
            </>
          ) : saved && !dirty ? (
            <>
              <Check className="mr-1.5 h-4 w-4" /> Saved
            </>
          ) : (
            "Save block"
          )}
        </Button>
        {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
      </div>
    </div>
  )
}
