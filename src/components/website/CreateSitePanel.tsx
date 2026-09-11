"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Globe, Loader2, Sparkles, PencilRuler, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { scaffoldSite, createBlankSite } from "@/app/website/actions"

export function CreateSitePanel({
  committeeName,
  thinProfile,
}: {
  committeeName: string
  thinProfile: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [running, setRunning] = useState<"scaffold" | "blank" | null>(null)
  const [error, setError] = useState<string | null>(null)

  function run(which: "scaffold" | "blank") {
    setError(null)
    setRunning(which)
    startTransition(async () => {
      const res = which === "scaffold" ? await scaffoldSite() : await createBlankSite()
      if (res.ok) router.refresh()
      else {
        setError(res.error)
        setRunning(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Committee Website</h1>
        <p className="mt-1 text-muted-foreground">
          Choose how to start — let AI draft a starter site from your profile, or build it yourself.
        </p>
      </div>

      {thinProfile && (
        <p className="max-w-2xl rounded-lg border border-[#c4910a]/30 bg-[#f0b429]/10 px-4 py-2.5 text-sm text-[#7a5a00]">
          Tip: your profile is still thin. Finishing the{" "}
          <Link href="/settings/voice" className="font-semibold underline">
            interview
          </Link>{" "}
          first will produce a much stronger draft — but you can start now and refine either way.
        </p>
      )}

      {error && (
        <p className="max-w-2xl rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Scaffold with AI */}
        <div className="flex flex-col rounded-2xl border border-border bg-white p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#c4910a]/10 text-[#c4910a]">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-[#1a1a2e]">Start with an AI draft</h2>
          <p className="mt-1.5 flex-1 text-sm text-muted-foreground">
            AI drafts a homepage plus About, Issues, and Get-involved pages from your candidates&apos;
            profiles, positions, and topics. Everything is editable — refine any section with AI or by hand.
          </p>
          <Button onClick={() => run("scaffold")} disabled={pending} className="mt-5">
            {running === "scaffold" ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Drafting your site…
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-4 w-4" /> Draft {committeeName}&apos;s site
              </>
            )}
          </Button>
          {running === "scaffold" && (
            <p className="mt-3 text-xs text-muted-foreground">This takes a few seconds.</p>
          )}
        </div>

        {/* Start from scratch */}
        <div className="flex flex-col rounded-2xl border border-border bg-white p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1b3a6b]/8 text-[#1b3a6b]">
            <PencilRuler className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-[#1a1a2e]">Start from scratch</h2>
          <p className="mt-1.5 flex-1 text-sm text-muted-foreground">
            Begin with a blank home page and build the site your way — add pages and sections from the
            palette, and use the AI actions on any section whenever you want a hand.
          </p>
          <Button variant="outline" onClick={() => run("blank")} disabled={pending} className="mt-5">
            {running === "blank" ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Creating…
              </>
            ) : (
              <>
                <Globe className="mr-1.5 h-4 w-4" /> Create a blank site
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Migration path */}
      <Link
        href="/website/templates"
        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white px-5 py-4 transition-colors hover:border-[#1b3a6b]/40 hover:bg-muted/40"
      >
        <span className="flex items-center gap-2.5">
          <Download className="h-5 w-5 text-[#1b3a6b]" />
          <span className="text-sm text-[#1a1a2e]">
            <b>Moving from another site?</b> Import an existing website and use it as your starting template.
          </span>
        </span>
        <span className="text-sm font-semibold text-[#1b3a6b]">Import →</span>
      </Link>
    </div>
  )
}
