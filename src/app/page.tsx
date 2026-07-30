import Link from "next/link"
import { redirect } from "next/navigation"
import {
  Megaphone,
  Globe,
  Mail,
  Users,
  HandCoins,
  Map,
  Lock,
  ArrowRight,
  Contact,
  Database,
  Building2,
  Check,
  type LucideIcon,
} from "lucide-react"
import { AppHeader } from "@/components/AppHeader"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  MODULES,
  PLAN_LABELS,
  PLAN_ORDER,
  toPlanId,
  type ModuleId,
  type PlanId,
} from "@/lib/entitlements"

const ICONS: Record<ModuleId, LucideIcon> = {
  "ai-communications": Megaphone,
  "candidate-websites": Globe,
  newsletter: Mail,
  "voter-outreach": Users,
  fundraising: HandCoins,
  "field-tools": Map,
  "multi-candidate": Building2,
}

interface Tile {
  key: string
  name: string
  tagline: string
  href: string
  icon: LucideIcon
}

// Core data surfaces (not pillar modules). Contacts/CRM is always on (Starter);
// the voter file is gated to Campaign — see VOTER_FILE_MIN_PLAN.
const CONTACTS_TILE: Tile = {
  key: "contacts",
  name: "Contacts / CRM",
  tagline: "Your unified contact list — every donor, volunteer, and voter in one place.",
  href: "/contacts",
  icon: Contact,
}

const VOTER_TILE: Tile = {
  key: "voters",
  name: "Voter File & Search",
  tagline: "Search, filter, and segment the voter file for your district.",
  href: "/voters",
  icon: Database,
}

function moduleTile(id: ModuleId): Tile {
  const m = MODULES.find((x) => x.id === id)!
  return { key: m.id, name: m.name, tagline: m.tagline, href: m.href, icon: ICONS[m.id] }
}

/**
 * Plan sections in upgrade order; each lists the components that tier adds.
 * Prices and tier contents mirror the marketing site (engagecampaign.org).
 */
const PLAN_GROUPS: {
  plan: PlanId
  blurb: string
  price: string
  cadence: string
  tiles: Tile[]
}[] = [
  {
    plan: "starter",
    blurb: "Get online and on-message — everything to launch your campaign.",
    price: "Free",
    cadence: "",
    tiles: [
      moduleTile("candidate-websites"),
      moduleTile("ai-communications"),
      moduleTile("newsletter"),
      CONTACTS_TILE,
    ],
  },
  {
    plan: "campaign",
    blurb: "Find, reach, and organize the voters in your district.",
    price: "$49",
    cadence: "/month",
    tiles: [VOTER_TILE, moduleTile("voter-outreach"), moduleTile("field-tools")],
  },
  {
    plan: "committee",
    blurb: "Premium donor data and multi-candidate slate management.",
    price: "Custom",
    cadence: "",
    tiles: [moduleTile("fundraising"), moduleTile("multi-candidate")],
  },
]

const planRank = (p: PlanId) => PLAN_ORDER.indexOf(p)

export default async function WorkspacePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  // Authoritative gate: read the campaign from the DB (avoids stale-JWT loops).
  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: { plan: true, candidateName: true, district: true },
  })
  if (!campaign) redirect("/onboarding")

  const plan: PlanId = toPlanId(campaign.plan)

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <AppHeader planLabel={PLAN_LABELS[plan]} />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">
            {campaign.candidateName
              ? `${campaign.candidateName}'s workspace`
              : "Your campaign workspace"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {campaign.district ? `${campaign.district} · ` : ""}Open a module, or unlock more of the
            platform.
          </p>
        </div>

        {/* Plan sections: a banner per tier, then that tier's components below. */}
        <div className="mt-8 space-y-10">
          {PLAN_GROUPS.map((group) => {
            const unlocked = planRank(plan) >= planRank(group.plan)
            const isCurrent = plan === group.plan

            return (
              <section key={group.plan}>
                {/* Plan banner */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#c4910a]">
                      {PLAN_LABELS[group.plan]} Plan
                    </span>
                    <span className="inline-flex items-baseline gap-0.5">
                      <span className="text-sm font-bold text-[#1a1a2e]">{group.price}</span>
                      {group.cadence && (
                        <span className="text-xs text-muted-foreground">{group.cadence}</span>
                      )}
                    </span>
                    <span className="text-sm text-muted-foreground">{group.blurb}</span>
                  </div>
                  <PlanChip unlocked={unlocked} isCurrent={isCurrent} planLabel={PLAN_LABELS[group.plan]} />
                </div>

                {/* Component cards for this tier */}
                <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {group.tiles.map((tile) => (
                    <ModuleCard
                      key={tile.key}
                      tile={tile}
                      unlocked={unlocked}
                      unlockPlanLabel={PLAN_LABELS[group.plan]}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}

function PlanChip({
  unlocked,
  isCurrent,
  planLabel,
}: {
  unlocked: boolean
  isCurrent: boolean
  planLabel: string
}) {
  if (isCurrent) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#1e6b3a]/10 px-3 py-1 text-xs font-semibold text-[#1e6b3a]">
        <Check className="h-3.5 w-3.5" />
        Your plan
      </span>
    )
  }
  if (unlocked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#1b3a6b]/8 px-3 py-1 text-xs font-medium text-[#1b3a6b]">
        <Check className="h-3.5 w-3.5" />
        Included
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#c4910a]/30 bg-[#f0b429]/10 px-3 py-1 text-xs font-semibold text-[#c4910a]">
      <Lock className="h-3 w-3" />
      Upgrade to {planLabel}
    </span>
  )
}

function ModuleCard({
  tile,
  unlocked,
  unlockPlanLabel,
}: {
  tile: Tile
  unlocked: boolean
  unlockPlanLabel: string
}) {
  const Icon = tile.icon

  if (unlocked) {
    return (
      <Link
        href={tile.href}
        className="group flex flex-col rounded-2xl border border-border bg-white p-6 transition-all hover:border-[#c4910a]/40 hover:shadow-lg"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1b3a6b]/5 text-[#1b3a6b] transition-colors group-hover:bg-[#1b3a6b] group-hover:text-white">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-[#1a1a2e]">{tile.name}</h3>
        <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{tile.tagline}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#c4910a]">
          Open
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    )
  }

  return (
    <div className="flex flex-col rounded-2xl border border-dashed border-border bg-white/60 p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1a1a2e]/[0.04] text-[#1a1a2e]/40">
        <Icon className="h-6 w-6" />
      </div>
      <div className="mt-5 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-[#1a1a2e]/70">{tile.name}</h3>
        <Lock className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{tile.tagline}</p>
      <button className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] px-4 py-2 text-sm font-semibold text-[#0f2044] transition-transform hover:scale-[1.03]">
        Unlock with {unlockPlanLabel}
      </button>
    </div>
  )
}
