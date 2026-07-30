"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Sparkles, Trash2, ExternalLink, Check, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SELECTABLE_AI_MODELS } from "@/lib/entitlements"
import {
  updateNewsletter,
  draftNewsletter,
  publishNewsletter,
  unpublishNewsletter,
  deleteNewsletter,
  sendNewsletter,
} from "@/app/newsletters/actions"

interface Editable {
  id: string
  subject: string
  preview: string
  body: string
  status: string
  publishedAt: string | null
  sentAt: string | null
  recipientCount: number | null
}

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"

export function NewsletterEditor({
  campaignId,
  sitePublished,
  defaultModel,
  activeSubscribers,
  hasMailingAddress,
  newsletter,
}: {
  campaignId: string
  sitePublished: boolean
  defaultModel: string
  activeSubscribers: number
  hasMailingAddress: boolean
  newsletter: Editable
}) {
  const router = useRouter()
  const [subject, setSubject] = useState(newsletter.subject)
  const [preview, setPreview] = useState(newsletter.preview)
  const [body, setBody] = useState(newsletter.body)
  const [instruction, setInstruction] = useState("")
  const [model, setModel] = useState(defaultModel)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [saving, startSave] = useTransition()
  const [drafting, startDraft] = useTransition()
  const [pub, startPub] = useTransition()
  const [deleting, startDelete] = useTransition()
  const [sending, startSend] = useTransition()
  const busy = saving || drafting || pub || deleting || sending

  const published = newsletter.status === "published"
  const sent = Boolean(newsletter.sentAt)
  const publicUrl = `/websites/${campaignId}/newsletter/${newsletter.id}`

  function doSend() {
    if (
      !confirm(
        `Email this newsletter to ${activeSubscribers} confirmed subscriber${
          activeSubscribers === 1 ? "" : "s"
        }? This can't be undone.`
      )
    )
      return
    setError(null)
    setNotice(null)
    startSend(async () => {
      const res = await sendNewsletter(newsletter.id)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setNotice(
        res.failed > 0
          ? `Sent to ${res.sent} of ${res.total} subscribers (${res.failed} failed).`
          : `Sent to ${res.sent} subscriber${res.sent === 1 ? "" : "s"}.`
      )
      router.refresh()
    })
  }

  function save() {
    setError(null)
    setNotice(null)
    startSave(async () => {
      const res = await updateNewsletter(newsletter.id, { subject, preview, body })
      if (!res.ok) setError(res.error)
      else {
        setNotice("Saved.")
        router.refresh()
      }
    })
  }

  function doDraft() {
    const text = instruction.trim()
    if (!text) return
    if (body.trim() && !confirm("Replace the current subject and content with an AI draft?")) return
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
      setBody(res.draft.body)
      setNotice("Draft ready — review and edit, then Save.")
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
      // Save current edits first, then publish.
      const saved = await updateNewsletter(newsletter.id, { subject, preview, body })
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/newsletters"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e]"
        >
          <ArrowLeft className="h-4 w-4" />
          All newsletters
        </Link>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
              published ? "bg-[#1e6b3a]/10 text-[#1e6b3a]" : "bg-[#c4910a]/15 text-[#7a5a00]"
            }`}
          >
            {newsletter.status}
          </span>
          {published && sitePublished && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#c4910a] hover:underline"
            >
              View in archive <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <button
            onClick={remove}
            disabled={busy}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            aria-label="Delete newsletter"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {published && !sitePublished && (
        <p className="mt-4 rounded-lg border border-[#c4910a]/30 bg-[#f0b429]/10 px-4 py-2.5 text-sm text-[#7a5a00]">
          This newsletter is published, but your website isn&apos;t live yet — publish your site to make the archive
          public.
        </p>
      )}

      {/* AI draft */}
      <div className="mt-5 rounded-2xl border border-border bg-white p-5">
        <div className="inline-flex items-center gap-2 font-semibold text-[#1a1a2e]">
          <Sparkles className="h-4 w-4 text-[#c4910a]" />
          Draft with AI
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe what this newsletter should cover — an update, an event, an ask — and I&apos;ll draft it in your
          voice. Uses one generation of Model Credits.
        </p>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          rows={2}
          placeholder="e.g. A recap of the town hall on property taxes, plus an invite to canvass this Saturday"
          disabled={busy}
          className={`mt-3 ${inputCls} resize-none`}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button onClick={doDraft} disabled={busy || !instruction.trim()}>
            {drafting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
            {drafting ? "Drafting…" : "Draft with AI"}
          </Button>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={busy}
            className="rounded-md border border-border bg-white px-2 py-1.5 text-xs text-muted-foreground outline-none"
          >
            {SELECTABLE_AI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {notice && (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#1e6b3a]/25 bg-[#1e6b3a]/8 px-4 py-2.5 text-sm text-[#1e6b3a]">
          <Check className="h-4 w-4" /> {notice}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      {/* Fields */}
      <div className="mt-5 space-y-4 rounded-2xl border border-border bg-white p-5">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">Subject</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Newsletter subject line"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">Preview text</span>
          <input
            value={preview}
            onChange={(e) => setPreview(e.target.value)}
            placeholder="Short teaser shown in the inbox preview (optional)"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">Content</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={16}
            placeholder="Write your newsletter… Separate paragraphs with a blank line."
            className={`${inputCls} leading-relaxed`}
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Plain text. Leave a blank line between paragraphs.
          </span>
        </label>
      </div>

      {/* Action bar */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button onClick={save} disabled={busy}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          Save
        </Button>
        <Button variant={published ? "outline" : "default"} onClick={togglePublish} disabled={busy}>
          {pub ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {published ? "Unpublish" : "Save & publish"}
        </Button>
      </div>

      {/* Send to subscribers */}
      <div className="mt-5 rounded-2xl border border-border bg-white p-5">
        <div className="inline-flex items-center gap-2 font-semibold text-[#1a1a2e]">
          <Send className="h-4 w-4 text-[#1b3a6b]" />
          Email to subscribers
        </div>

        {sent ? (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#1e6b3a]/25 bg-[#1e6b3a]/8 px-4 py-2.5 text-sm text-[#1e6b3a]">
            <Check className="h-4 w-4" />
            Sent{newsletter.recipientCount != null ? ` to ${newsletter.recipientCount} subscribers` : ""} on{" "}
            {new Date(newsletter.sentAt!).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
            .
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              {published
                ? `Send this issue to your ${activeSubscribers} confirmed subscriber${
                    activeSubscribers === 1 ? "" : "s"
                  }. It sends once — you can't unsend.`
                : "Publish this newsletter first, then you can email it to your subscribers."}
            </p>

            {published && !hasMailingAddress && (
              <p className="mt-3 rounded-lg border border-[#c4910a]/30 bg-[#f0b429]/10 px-4 py-2.5 text-sm text-[#7a5a00]">
                Add a mailing address in{" "}
                <Link href="/settings" className="font-medium underline">
                  Settings
                </Link>{" "}
                before sending — a postal address is legally required in every email.
              </p>
            )}
            {published && hasMailingAddress && activeSubscribers === 0 && (
              <p className="mt-3 rounded-lg border border-border bg-[#f4f6f9] px-4 py-2.5 text-sm text-muted-foreground">
                You have no confirmed subscribers yet. Once people subscribe and confirm, you can email them here.
              </p>
            )}

            <div className="mt-3">
              <Button
                onClick={doSend}
                disabled={busy || !published || !hasMailingAddress || activeSubscribers === 0}
              >
                {sending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-1.5 h-4 w-4" />
                )}
                {sending ? "Sending…" : `Send to ${activeSubscribers} subscriber${activeSubscribers === 1 ? "" : "s"}`}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
