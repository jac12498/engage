import { prisma } from "@/lib/prisma"
import { requireCommittee } from "@/lib/context"
import { committeeTypeLabel, isJurisdiction, allowsMultipleCandidates } from "@/lib/committeeTypes"
import { CommitteeOnboardingForm } from "@/components/onboarding/CommitteeOnboardingForm"
import { CommitteeAssetsForm } from "@/components/committees/CommitteeAssetsForm"
import { CommitteePicker, type PickerCommittee } from "@/components/committees/CommitteePicker"
import { updateActiveCommittee } from "@/app/committees/actions"

export const dynamic = "force-dynamic"
export const metadata = { title: "Committee settings · Engage" }

export default async function CommitteeSettingsPage() {
  // All members can view (switch/create); only admins+ edit the registration form.
  const { committee, role, userId } = await requireCommittee()
  const canManage = role === "owner" || role === "admin"

  const memberships = await prisma.committeeMembership.findMany({
    where: { userId },
    select: {
      role: true,
      committee: {
        select: {
          id: true,
          name: true,
          state: true,
          committeeType: true,
          logoMime: true,
          // For the single-candidate fallback: the (only) candidate's logo, then image.
          candidates: {
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { id: true, logoMime: true, headshotMime: true },
          },
          _count: { select: { candidates: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  const committees: PickerCommittee[] = memberships.map((m) => {
    const c = m.committee
    const cand = c.candidates[0]
    // Committee logo wins; for a single-candidate committee with no committee logo,
    // fall back to that candidate's logo, then their headshot image.
    const singleCandidate = !allowsMultipleCandidates(c.committeeType) && cand
    const logoUrl = c.logoMime
      ? `/api/committee/logo/${c.id}`
      : singleCandidate && cand.logoMime
        ? `/api/candidate/logo/${cand.id}`
        : singleCandidate && cand.headshotMime
          ? `/api/website/headshot/${cand.id}`
          : null
    return {
      id: c.id,
      name: c.name,
      role: m.role,
      typeLabel: committeeTypeLabel(c.state, c.committeeType),
      state: c.state,
      campaignCount: c._count.candidates,
      logoUrl,
    }
  })

  return (
    <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Committee settings</h1>
        <p className="mt-1 text-muted-foreground">
          Your committee&rsquo;s registration details, and the committees you belong to.
        </p>

        {canManage ? (
          <div className="mt-8">
            <CommitteeOnboardingForm
              key={committee.id}
              submitAction={updateActiveCommittee}
              submitLabel="Save changes"
              pendingLabel="Saving…"
              savedLabel="Saved"
              initial={{
                jurisdiction: isJurisdiction(committee.jurisdiction) ? committee.jurisdiction : "state",
                state: committee.state ?? "",
                committeeType: committee.committeeType ?? "",
                name: committee.name,
                filerId: committee.filerId ?? "",
              }}
            />

            <div className="mt-8">
              <CommitteeAssetsForm
                key={committee.id}
                committeeId={committee.id}
                hasLogo={!!committee.logoMime}
                initial={{
                  actblueUrl: committee.actblueUrl ?? "",
                  websiteUrl: committee.websiteUrl ?? "",
                  mailingStreet: committee.mailingStreet ?? "",
                  mailingStreet2: committee.mailingStreet2 ?? "",
                  mailingCity: committee.mailingCity ?? "",
                  mailingState: committee.mailingState ?? "",
                  mailingZip: committee.mailingZip ?? "",
                }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-8 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Only committee owners and admins can edit registration details.
          </p>
        )}

        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Your committees</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Switch the active committee, or create a new one.
          </p>
          <div className="mt-4">
            <CommitteePicker
              committees={committees}
              activeCommitteeId={committee.id}
              afterHref="/committees/settings"
              showManage={false}
            />
          </div>
        </div>
    </div>
  )
}
