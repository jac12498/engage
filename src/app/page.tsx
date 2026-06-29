import Link from "next/link"
import {
  Megaphone,
  Globe,
  Users,
  HandCoins,
  Map,
  Lock,
  ArrowRight,
  Contact,
  Database,
  type LucideIcon,
} from "lucide-react"
import { AppHeader } from "@/components/AppHeader"
import {
  MODULES,
  PLAN_LABELS,
  PLAN_ORDER,
  getCurrentPlan,
  isUnlocked,
  unlockPlanFor,
  isPlanId,
  type ModuleId,
  type PlanId,
} from "@/lib/entitlements"

const ICONS: Record<ModuleId, LucideIcon> = {
  "ai-communications": Megaphone,
  "candidate-websites": Globe,
  "voter-outreach": Users,
  fundraising: HandCoins,
  "field-tools": Map,
}

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const { plan: planParam } = await searchParams
  const plan: PlanId = isPlanId(planParam) ? planParam : getCurrentPlan()

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <AppHeader planLabel={PLAN_LABELS[plan]} />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a2e]">Your campaign workspace</h1>
            <p className="mt-1 text-muted-foreground">
              Open a module, or unlock more of the platform.
            </p>
          </div>
          <PlanSwitcher current={plan} />
        </div>

        {/* Always-on core */}
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-white px-5 py-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#c4910a]">
            Included on every plan
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-[#1a1a2e]">
            <Contact className="h-4 w-4 text-[#1b3a6b]" /> Contacts / CRM
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-[#1a1a2e]">
            <Database className="h-4 w-4 text-[#1b3a6b]" /> Voter file &amp; search
          </span>
        </div>

        {/* Module tiles */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => {
            const Icon = ICONS[m.id]
            const unlocked = isUnlocked(m.id, plan)

            if (unlocked) {
              return (
                <Link
                  key={m.id}
                  href={m.href}
                  className="group flex flex-col rounded-2xl border border-border bg-white p-6 transition-all hover:border-[#c4910a]/40 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1b3a6b]/5 text-[#1b3a6b] transition-colors group-hover:bg-[#1b3a6b] group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-[#1a1a2e]">{m.name}</h3>
                  <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{m.tagline}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#c4910a]">
                    Open
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              )
            }

            const plan_ = unlockPlanFor(m.id)
            return (
              <div
                key={m.id}
                className="flex flex-col rounded-2xl border border-dashed border-border bg-white/60 p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1a1a2e]/[0.04] text-[#1a1a2e]/40">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="mt-5 flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-[#1a1a2e]/70">{m.name}</h3>
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{m.tagline}</p>
                <button className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] px-4 py-2 text-sm font-semibold text-[#0f2044] transition-transform hover:scale-[1.03]">
                  Unlock with {PLAN_LABELS[plan_]}
                </button>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}

/**
 * Temporary plan-preview switcher (stub). Lets us see the unlocked/locked states
 * across plans before entitlements are wired to the account. Server-rendered via
 * the `?plan=` query param — no client JS.
 */
function PlanSwitcher({ current }: { current: PlanId }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-white p-1 text-xs">
      <span className="px-2 text-muted-foreground">Preview plan:</span>
      {PLAN_ORDER.map((p) => (
        <Link
          key={p}
          href={`/?plan=${p}`}
          className={`rounded-md px-2.5 py-1 font-medium capitalize transition-colors ${
            current === p ? "bg-[#1b3a6b] text-white" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {p}
        </Link>
      ))}
    </div>
  )
}
