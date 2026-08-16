import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"
import { toPlanId } from "@/lib/entitlements"
import { AppSidebar } from "./AppSidebar"

/**
 * Authenticated workspace shell: the persistent left sidebar (module navigation +
 * committee/campaign switchers + identity + account) around the page content.
 * Self-contains the auth gate, so each authed layout/page just wraps its content
 * in <AppShell>.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const ctx = await getActiveContext()
  // No committee at all → onboarding. (getActiveContext returns null when signed
  // out too; onboarding itself re-gates and bounces signed-out users to /sign-in.)
  if (!ctx) redirect("/onboarding")

  const { userId, committee, role, campaign } = ctx

  // Data for the two switchers: every committee the user belongs to, and every
  // campaign within the active committee.
  const [memberships, campaigns] = await Promise.all([
    prisma.committeeMembership.findMany({
      where: { userId },
      select: { role: true, committee: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.campaign.findMany({
      where: { committeeId: committee.id },
      select: { id: true, candidateName: true, committeeName: true },
      orderBy: { createdAt: "asc" },
    }),
  ])

  // Active-campaign identity for the header (falls back to the committee name).
  const sidebarCampaign = campaign
    ? {
        id: campaign.id,
        candidateName: campaign.candidateName,
        committeeName: campaign.committeeName,
        headshotMime: campaign.headshotMime,
      }
    : null

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <AppSidebar
        campaign={sidebarCampaign}
        plan={toPlanId(committee.plan)}
        role={role}
        committees={memberships.map((m) => ({ id: m.committee.id, name: m.committee.name }))}
        activeCommitteeId={committee.id}
        committeeName={committee.name}
        campaigns={campaigns}
        activeCampaignId={campaign?.id ?? null}
      />
      <div className="md:pl-60">
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </div>
  )
}
