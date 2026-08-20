import Link from "next/link"
import { ArrowRight, Wrench } from "lucide-react"
import type { SetupRequirement } from "@/lib/moduleStatus"

/**
 * Shown in place of a module's operations when a hard prerequisite is unmet, so a
 * module can't be used before it's set up (matches the dashboard "Needs setup"
 * status). Rendered by each module's layout — see e.g. app/communications/layout.tsx.
 */
export function ModuleSetupGate({
  moduleName,
  requirement,
}: {
  moduleName: string
  requirement: SetupRequirement
}) {
  return (
    <div className="mx-auto mt-4 max-w-lg rounded-2xl border border-[#c4910a]/30 bg-[#c4910a]/6 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#c4910a]/12 text-[#c4910a]">
        <Wrench className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-lg font-semibold text-[#1a1a2e]">Finish setup to use {moduleName}</h1>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{requirement.reason}.</p>
      <Link
        href={requirement.href}
        className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[#1b3a6b] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#122850]"
      >
        {requirement.cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
