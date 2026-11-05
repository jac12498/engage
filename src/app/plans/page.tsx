import { Check } from "lucide-react"
import { requireCommittee } from "@/lib/context"
import { toPlanId, PLAN_LABELS, PLAN_ORDER, type PlanId } from "@/lib/entitlements"
import { isDevEnv } from "@/lib/appEnv"
import { AppShell } from "@/components/AppShell"
import { setDevPlan } from "./actions"

export const dynamic = "force-dynamic"
export const metadata = { title: "Plans · Engage" }

const TIERS: { plan: PlanId; price: string; cadence: string; blurb: string; features: string[] }[] = [
  {
    plan: "starter",
    price: "Free",
    cadence: "",
    blurb: "Get online and on-message.",
    features: ["Communications", "Candidate website", "Newsletter", "Contacts / CRM"],
  },
  {
    plan: "campaign",
    price: "$49",
    cadence: "/month",
    blurb: "Find, reach, and organize your voters.",
    features: [
      "Everything in Starter",
      "Voter File & Search",
      "Voter Outreach (email + text)",
      "Field & canvassing tools",
    ],
  },
  {
    plan: "committee",
    price: "Custom",
    cadence: "",
    blurb: "Premium donor data + multi-candidate.",
    features: ["Everything in Campaign", "Fundraising", "Multi-candidate / slate"],
  },
]

const rank = (p: PlanId) => PLAN_ORDER.indexOf(p)

export default async function PlansPage() {
  const { committee } = await requireCommittee()
  const plan = toPlanId(committee.plan)
  const dev = isDevEnv()

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Plans</h1>
        <p className="mt-1 text-muted-foreground">
          You&rsquo;re on the <span className="font-medium text-[#1a1a2e]">{PLAN_LABELS[plan]}</span> plan.
          Upgrade any time to unlock more of the platform.
        </p>
        {dev && (
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            <span className="font-semibold">Development database.</span> You can switch this committee to any plan
            below to build and test gated features (for example the Voter File, which unlocks at Campaign). This
            switch does not exist in production.
          </p>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {TIERS.map((tier) => {
          const isCurrent = tier.plan === plan
          const isUpgrade = rank(tier.plan) > rank(plan)
          return (
            <div
              key={tier.plan}
              className={`relative flex flex-col rounded-2xl border bg-white p-6 ${
                isCurrent ? "border-[#1b3a6b] ring-1 ring-[#1b3a6b]/20" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#1a1a2e]">{PLAN_LABELS[tier.plan]}</h2>
                {isCurrent && (
                  <span className="rounded-full bg-[#1e6b3a]/10 px-2.5 py-0.5 text-xs font-semibold text-[#1e6b3a]">
                    Your plan
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-black text-[#1a1a2e]">{tier.price}</span>
                {tier.cadence && <span className="text-sm text-muted-foreground">{tier.cadence}</span>}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{tier.blurb}</p>

              <ul className="mt-5 flex-1 space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#1a1a2e]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#c4910a]" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  <div className="rounded-lg border border-border px-4 py-2.5 text-center text-sm font-medium text-muted-foreground">
                    Current plan
                  </div>
                ) : dev ? (
                  <form action={setDevPlan}>
                    <input type="hidden" name="plan" value={tier.plan} />
                    <button
                      type="submit"
                      className="w-full cursor-pointer rounded-lg border border-amber-400 bg-amber-50 px-4 py-2.5 text-center text-sm font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      Switch to {PLAN_LABELS[tier.plan]} (dev only)
                    </button>
                  </form>
                ) : isUpgrade ? (
                  <a
                    href={`mailto:hello@engageamplify.com?subject=Upgrade to ${PLAN_LABELS[tier.plan]}`}
                    className="block rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] px-4 py-2.5 text-center text-sm font-semibold text-[#0f2044] transition-transform hover:scale-[1.02]"
                  >
                    Upgrade to {PLAN_LABELS[tier.plan]}
                  </a>
                ) : (
                  <div className="rounded-lg border border-border px-4 py-2.5 text-center text-sm font-medium text-muted-foreground">
                    Included
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Questions about upgrading? Email{" "}
        <a href="mailto:hello@engageamplify.com" className="text-[#1b3a6b] hover:underline">
          hello@engageamplify.com
        </a>
        .
      </p>
    </AppShell>
  )
}
