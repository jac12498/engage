"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Globe, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateSite } from "@/app/website/actions"

export function CreateSitePanel({
  candidateName,
  office,
  thinProfile,
}: {
  candidateName: string
  office: string
  thinProfile: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function create() {
    setError(null)
    startTransition(async () => {
      const res = await generateSite()
      if (res.ok) router.refresh()
      else setError(res.error)
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Candidate Website</h1>
        <p className="mt-1 text-muted-foreground">
          A clean, mobile-ready campaign site — drafted from everything you&apos;ve already told us.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1b3a6b]/5 text-[#1b3a6b]">
          <Globe className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-[#1a1a2e]">
          Build {candidateName}&apos;s campaign website
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
          We&apos;ll draft your homepage, an About section, your issues, and a volunteer signup — using
          your profile, values, and positions for {office}. You can edit everything before it goes live.
        </p>

        {thinProfile && (
          <p className="mx-auto mt-4 max-w-md rounded-lg border border-[#c4910a]/30 bg-[#f0b429]/10 px-4 py-2.5 text-sm text-[#7a5a00]">
            Tip: your profile is still thin. Finishing the{" "}
            <Link href="/communications/interview" className="font-semibold underline">
              interview
            </Link>{" "}
            first will produce a much stronger site — but you can generate now and refine either way.
          </p>
        )}

        {error && (
          <p className="mx-auto mt-4 max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </p>
        )}

        <Button onClick={create} disabled={pending} className="mt-6">
          {pending ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Drafting your site…
            </>
          ) : (
            <>
              <Sparkles className="mr-1.5 h-4 w-4" /> Generate my website
            </>
          )}
        </Button>
        {pending && (
          <p className="mt-3 text-xs text-muted-foreground">This takes a few seconds.</p>
        )}
      </div>
    </div>
  )
}
