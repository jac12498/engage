"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Download, Globe, Trash2, LayoutTemplate, ArrowRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  importWebsiteAsTemplate,
  createSiteFromTemplate,
  deleteTemplate,
} from "@/app/website/import-actions"

interface TemplateSummary {
  id: string
  name: string
  description: string | null
  source: string | null
  appliesTo: string
  pageCount: number
  createdAt: string | Date
}

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"

export function TemplatesManager({
  templates,
  hasSite,
}: {
  templates: TemplateSummary[]
  hasSite: boolean
}) {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [rowBusy, startRow] = useTransition()

  const validUrl = /^https?:\/\/.+\..+/i.test(url.trim())

  async function doImport() {
    setConfirmOpen(false)
    setImporting(true)
    setError(null)
    setNotice(null)
    try {
      const res = await importWebsiteAsTemplate({ url: url.trim(), acknowledgedRights: true })
      if (res.ok) {
        setUrl("")
        setNotice(`Imported “${res.name}” (${res.pages} ${res.pages === 1 ? "page" : "pages"}) as a template.`)
        router.refresh()
      } else {
        setError(res.error)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The import failed. Please try again.")
    } finally {
      setImporting(false)
    }
  }

  function useTemplate(t: TemplateSummary) {
    setError(null)
    if (hasSite && !confirm(`Replace your current website with “${t.name}”? This swaps all pages (your site's address, publish state, and logo are kept).`))
      return
    startRow(async () => {
      const res = await createSiteFromTemplate(t.id, { replace: hasSite })
      if (res.ok) router.push("/website")
      else setError(res.error)
    })
  }

  function removeTemplate(t: TemplateSummary) {
    if (!confirm(`Delete the template “${t.name}”?`)) return
    setError(null)
    startRow(async () => {
      const res = await deleteTemplate(t.id)
      if (res.ok) router.refresh()
      else setError(res.error)
    })
  }

  return (
    <div className="space-y-6">
      {/* Import */}
      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-[#1b3a6b]" />
          <h2 className="text-base font-semibold text-[#1a1a2e]">Import an existing website</h2>
        </div>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          Paste the address of a website and we&rsquo;ll read its content and rebuild it in this builder&rsquo;s
          format, saved as your own template. This imports the <b>content</b> — text and structure — not the exact
          design; images aren&rsquo;t carried over. You refine it afterward.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className={`${inputCls} max-w-md`}
            disabled={importing}
          />
          <Button onClick={() => setConfirmOpen(true)} disabled={!validUrl || importing}>
            {importing ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Importing…
              </>
            ) : (
              "Import website"
            )}
          </Button>
        </div>
        {importing && (
          <p className="mt-2 text-xs text-muted-foreground">
            Reading the site and structuring it — this can take up to a minute.
          </p>
        )}
        {notice && (
          <p className="mt-3 rounded-lg border border-[#1e6b3a]/25 bg-[#1e6b3a]/5 px-3 py-2 text-sm text-[#1e6b3a]">
            {notice}
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
      </div>

      {/* Saved templates */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Your templates
        </h2>
        {templates.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-white p-6 text-center text-sm text-muted-foreground">
            No templates yet. Import a website above to create your first one.
          </p>
        ) : (
          <ul className="space-y-2">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <LayoutTemplate className="h-4 w-4 shrink-0 text-[#1b3a6b]" />
                    <span className="truncate font-medium text-[#1a1a2e]">{t.name}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span>
                      {t.pageCount} {t.pageCount === 1 ? "page" : "pages"}
                    </span>
                    {t.source?.startsWith("import:") && (
                      <>
                        <span className="text-muted-foreground/50">·</span>
                        <span>from {t.source.slice("import:".length)}</span>
                      </>
                    )}
                    <span className="text-muted-foreground/50">·</span>
                    <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => useTemplate(t)} disabled={rowBusy}>
                    <Globe className="mr-1.5 h-4 w-4" />
                    {hasSite ? "Use (replace site)" : "Create site"}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                  <button
                    onClick={() => removeTemplate(t)}
                    disabled={rowBusy}
                    className="rounded-lg border border-border p-2 text-muted-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    title="Delete template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Rights confirmation dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#c4910a]" />
              <h3 className="text-base font-semibold text-[#1a1a2e]">Do you have the rights to use this website?</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Only import websites you own or have permission to use. We&rsquo;ll read the content at{" "}
              <b className="break-all text-[#1a1a2e]">{url.trim()}</b> and save it as your committee&rsquo;s private
              template. You&rsquo;re responsible for having the rights to reuse it.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button onClick={doImport}>Yes, I have the rights — import</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
