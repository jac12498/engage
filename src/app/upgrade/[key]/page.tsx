import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Check, Lock } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { toPlanId, PLAN_LABELS } from "@/lib/entitlements"
import { NAV_MODULES, navModuleUnlocked, navUnlockPlan } from "@/lib/nav"
import { UPGRADE_HIGHLIGHTS } from "@/lib/upgrade"
import { AppShell } from "@/components/AppShell"

export const dynamic = "force-dynamic"

export default async function UpgradePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const mod = NAV_MODULES.find((m) => m.key === key)
  const highlight = UPGRADE_HIGHLIGHTS[key]
  if (!mod || !highlight) notFound()

  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")
  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: { plan: true },
  })
  if (!campaign) redirect("/onboarding")

  const plan = toPlanId(campaign.plan)
  // Already entitled → no upsell; go straight to the module.
  if (navModuleUnlocked(mod, plan)) redirect(mod.href)

  const unlockPlan = navUnlockPlan(mod)
  const Icon = mod.icon

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-border bg-white">
          {/* Hero */}
          <div className="relative bg-gradient-to-br from-[#0f2044] to-[#1b3a6b] px-8 py-10 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-[#f0b429]">
                <Icon className="h-6 w-6" />
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                <Lock className="h-3 w-3" />
                Available on {PLAN_LABELS[unlockPlan]}
              </span>
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight">{mod.name}</h1>
          </div>

          {/* Body */}
          <div className="px-8 py-7">
            <ul className="space-y-3">
              {highlight.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-[#1a1a2e]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#c4910a]" />
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/plans"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] px-6 py-3 text-sm font-semibold text-[#0f2044] transition-transform hover:scale-[1.03]"
              >
                Upgrade to {PLAN_LABELS[unlockPlan]}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {highlight.marketingHref && (
                <Link
                  href={highlight.marketingHref}
                  className="text-sm font-medium text-[#1b3a6b] hover:underline"
                >
                  See the full overview
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
