import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"
import { toPlanId } from "@/lib/entitlements"
import { allowsMultipleCandidates } from "@/lib/committeeTypes"
import { isDevEnv } from "@/lib/appEnv"
import { APP_VERSION } from "@/lib/releaseNotes"
import { stopImpersonation } from "@/app/admin/actions"
import { dismissRegistryAlert } from "@/app/actions/registry"
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

  const { userId, committee, role, candidate, campaign, permissions, isSystemAdmin } = ctx

  // Switcher data: committees the user belongs to, candidates in the active committee,
  // and campaigns (runs) under the active candidate.
  const [memberships, candidates, campaignRuns, volunteerBlock, userRow] = await Promise.all([
    prisma.committeeMembership.findMany({
      where: { userId },
      select: { role: true, committee: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.candidate.findMany({
      where: { committeeId: committee.id },
      select: { id: true, candidateName: true },
      orderBy: { createdAt: "asc" },
    }),
    candidate
      ? prisma.campaign.findMany({
          where: { candidateId: candidate.id },
          select: { id: true, cycle: true, office: true },
          orderBy: [{ cycle: "desc" }, { createdAt: "desc" }],
        })
      : Promise.resolve([]),
    // "Volunteer signups" is only relevant once the committee site has a volunteer form.
    prisma.block.findFirst({
      where: { type: "volunteerForm", page: { website: { committeeId: committee.id } } },
      select: { id: true },
    }),
    // For the "What's new" unseen-dot: the latest release the user has viewed.
    prisma.user.findUnique({
      where: { id: userId },
      select: { lastSeenReleaseVersion: true },
    }),
  ])
  const hasVolunteerForm = !!volunteerBlock
  const hasUnseenRelease = (userRow?.lastSeenReleaseVersion ?? null) !== APP_VERSION

  // When a system admin is impersonating, resolve the target's display name for
  // the banner (ctx.userId is the impersonated member; committee is theirs).
  let impersonation: { name: string; committee: string } | null = null
  if (ctx.impersonating) {
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    })
    impersonation = { name: target?.name || target?.email || "member", committee: committee.name }
  }

  // Active-candidate identity for the header (falls back to the committee name).
  const sidebarCampaign = candidate
    ? {
        id: candidate.id,
        candidateName: candidate.candidateName,
        committeeName: campaign?.committeeName ?? null,
        headshotMime: candidate.headshotMime,
      }
    : null

  // Candidate cardinality: single-candidate committees cap at one; party/multi allow many.
  const multiCandidate = allowsMultipleCandidates(committee.committeeType)

  // Sidebar avatar: committee logo → (single-candidate) candidate logo → candidate image.
  const committeeAvatarUrl = committee.logoMime
    ? `/api/committee/logo/${committee.id}`
    : !multiCandidate && candidate?.logoMime
      ? `/api/candidate/logo/${candidate.id}`
      : !multiCandidate && candidate?.headshotMime
        ? `/api/website/headshot/${candidate.id}`
        : null
  const canAddCandidate =
    permissions.has("campaigns:manage") && (multiCandidate || candidates.length === 0)

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <AppSidebar
        isDev={isDevEnv()}
        hasUnseenRelease={hasUnseenRelease}
        campaign={sidebarCampaign}
        plan={toPlanId(committee.plan)}
        role={role}
        permissions={[...permissions]}
        isSystemAdmin={isSystemAdmin}
        committees={memberships.map((m) => ({ id: m.committee.id, name: m.committee.name }))}
        activeCommitteeId={committee.id}
        committeeName={committee.name}
        committeeAvatarUrl={committeeAvatarUrl}
        candidates={candidates.map((c) => ({ id: c.id, candidateName: c.candidateName }))}
        activeCandidateId={candidate?.id ?? null}
        campaigns={campaignRuns.map((c) => ({ id: c.id, cycle: c.cycle, office: c.office }))}
        activeCampaignId={campaign?.id ?? null}
        canAddCandidate={canAddCandidate}
        multiCandidate={multiCandidate}
        sectionGates={{ volunteerSignups: hasVolunteerForm, manageTags: permissions.has("contacts:update"), manageFields: permissions.has("contacts:update") }}
      />
      <div className="md:pl-60">
        {impersonation && (
          <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 bg-[#c4910a] px-6 py-2 text-sm text-white">
            <span>
              Viewing as <strong>{impersonation.name}</strong> in <strong>{impersonation.committee}</strong>{" "}
              <span className="opacity-80">· system admin</span>
            </span>
            <form action={stopImpersonation}>
              <button className="rounded-md bg-white/20 px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/30">
                Stop
              </button>
            </form>
          </div>
        )}
        {committee.registryAlert && (
          <div
            className={`flex flex-wrap items-center justify-between gap-2 border-b px-6 py-2.5 text-sm ${
              committee.registryAlert === "terminated"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-[#c4910a]/30 bg-[#c4910a]/10 text-[#7a5a00]"
            }`}
          >
            <span>
              {committee.registryAlert === "terminated" ? (
                <>
                  <strong>{committee.name}</strong>&rsquo;s state registration now shows{" "}
                  <strong>{committee.registryStatus}</strong> in the Board of Elections registry. Your account isn&rsquo;t
                  affected — this is for your awareness.
                </>
              ) : (
                <>
                  <strong>{committee.name}</strong>&rsquo;s Board of Elections registry details changed (name, treasurer,
                  or address). Please review your committee&rsquo;s information.
                </>
              )}
            </span>
            <form action={dismissRegistryAlert}>
              <button className="rounded-md border border-current/30 px-3 py-1 text-xs font-semibold transition-colors hover:bg-black/5">
                Dismiss
              </button>
            </form>
          </div>
        )}
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </div>
  )
}
