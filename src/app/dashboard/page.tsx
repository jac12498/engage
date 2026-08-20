import Link from "next/link"
import { ArrowRight, Lock, Megaphone, UserPlus, Wrench } from "lucide-react"
import { AppShell } from "@/components/AppShell"
import { requireCommittee, campaignProfile } from "@/lib/context"
import { computeModuleStatuses, type ModuleStatus } from "@/lib/moduleStatus"
import { PLAN_LABELS, toPlanId } from "@/lib/entitlements"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const { committee, candidate, campaign, permissions } = await requireCommittee()

  // A committee legitimately starts with no candidate — nothing to show statuses
  // for yet, so keep the "add your first candidate" get-started home.
  if (!candidate || !campaign) {
    return (
      <AppShell>
        <NoCampaignHome committeeName={committee.name} canManage={permissions.has("campaigns:manage")} />
      </AppShell>
    )
  }

  const plan = toPlanId(committee.plan)
  const modules = computeModuleStatuses(campaignProfile(candidate, campaign), plan, permissions)

  // Modules the plan includes (usable or needing setup) vs. those to unlock.
  const available = modules.filter((m) => m.status !== "locked")
  const locked = modules.filter((m) => m.status === "locked")

  const activeCount = available.filter((m) => m.status === "active").length
  const setupCount = available.filter((m) => m.status === "needs-setup").length

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">
            {candidate.candidateName ? `${candidate.candidateName}'s campaign` : committee.name}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Your workspace — open a module, or finish its setup to unlock it.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-[#1e6b3a]">{activeCount} active</span>
          {setupCount > 0 && (
            <> · <span className="font-semibold text-[#c4910a]">{setupCount} need setup</span></>
          )}
          {locked.length > 0 && <> · {locked.length} to unlock</>}
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {available.map((m) => (
          <ModuleCard key={m.key} module={m} />
        ))}
      </div>

      {locked.length > 0 && (
        <>
          <hr className="my-8 border-t border-border" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Upgrade to unlock
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Modules included on higher plans.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {locked.map((m) => (
              <ModuleCard key={m.key} module={m} />
            ))}
          </div>
        </>
      )}
    </AppShell>
  )
}

function ModuleCard({ module: m }: { module: ModuleStatus }) {
  const Icon = m.icon

  if (m.status === "locked") {
    const planLabel = m.unlockPlan ? PLAN_LABELS[m.unlockPlan] : "a paid"
    return (
      <Link
        href={`/upgrade/${m.key}`}
        className="group flex flex-col rounded-2xl border border-border bg-muted/40 p-5 transition-colors hover:border-[#1b3a6b]/40"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="mt-3 font-semibold text-[#1a1a2e]">{m.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">Included in the {planLabel} plan.</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#1b3a6b]">
          <Lock className="h-3.5 w-3.5" />
          Upgrade to use
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    )
  }

  if (m.status === "needs-setup") {
    return (
      <div className="flex flex-col rounded-2xl border border-[#c4910a]/30 bg-[#c4910a]/6 p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c4910a]/12 text-[#c4910a]">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="mt-3 font-semibold text-[#1a1a2e]">{m.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{m.setupReason}</p>
        <Link
          href={m.setupHref ?? "/settings"}
          className="mt-4 inline-flex items-center gap-1.5 self-start rounded-lg bg-[#1b3a6b] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#122850]"
        >
          <Wrench className="h-4 w-4" />
          Set up
        </Link>
      </div>
    )
  }

  // active
  return (
    <Link
      href={m.href}
      className="group flex flex-col rounded-2xl border border-[#1e6b3a]/25 bg-[#1e6b3a]/5 p-5 transition-colors hover:border-[#1e6b3a]/45"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e6b3a]/10 text-[#1e6b3a]">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-3 font-semibold text-[#1a1a2e]">{m.name}</h3>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#1b3a6b]">
        Open
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

function NoCampaignHome({ committeeName, canManage }: { committeeName: string; canManage: boolean }) {
  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">{committeeName}</h1>
        <p className="mt-1 text-muted-foreground">
          Your committee is set up. Add your first candidate to start using Communications, your
          website, and newsletters.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#1b3a6b]/8 text-[#1b3a6b]">
          <Megaphone className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-[#1a1a2e]">Add your first candidate</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          A candidate is one person your committee runs. Each gets their own Communications, website,
          and newsletter.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {canManage ? (
            <Link
              href="/candidates/new"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1b3a6b] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#122850]"
            >
              <Megaphone className="h-4 w-4" />
              Add a candidate
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ask a committee owner or admin to add the first candidate.
            </p>
          )}
          {canManage && (
            <Link
              href="/members"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-[#1a1a2e] transition-colors hover:border-[#1b3a6b]/40"
            >
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              Invite members
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
