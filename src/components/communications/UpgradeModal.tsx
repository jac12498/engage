"use client"

import Link from "next/link"
import { Sparkles, X, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PLAN_LABELS } from "@/lib/entitlements"

/**
 * Shown the moment a free user's Model Credit balance hits zero — typically
 * right after they've watched a generation stream in, so it lands warm. Routes
 * to the plan dashboard (`/`), the current home for upgrade CTAs.
 */
export function UpgradeModal({
  open,
  onClose,
  limit,
}: {
  open: boolean
  onClose: () => void
  /** The plan's monthly credit allotment, for the copy. */
  limit: number
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <div
        className="mx-auto mt-24 w-full max-w-md rounded-2xl border border-border bg-white p-7 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f0b429]/12 text-[#c4910a]">
            <Sparkles className="h-5 w-5" />
          </div>
          <button
            onClick={onClose}
            className="-mr-1 -mt-1 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-[#1a1a2e]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 className="mt-4 text-xl font-bold text-[#1a1a2e]">You&apos;re out of Model Credits</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Your free plan includes {limit} Model Credits each month. Upgrade to{" "}
          <span className="font-medium text-[#1a1a2e]">{PLAN_LABELS.campaign}</span> for{" "}
          <span className="font-medium text-[#1a1a2e]">unlimited generations</span> on every model —
          Haiku, Sonnet, and Opus.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/">
              See {PLAN_LABELS.campaign} plans
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full">
            Maybe later
          </Button>
        </div>
      </div>
    </div>
  )
}
