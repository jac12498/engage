import Link from "next/link"
import {
  ClipboardList,
  BookOpen,
  Lightbulb,
  Check,
  Circle,
  GraduationCap,
  Scale,
  type LucideIcon,
} from "lucide-react"
import { prisma } from "@/lib/prisma"
import { requireActiveCampaign } from "@/lib/context"
import { allowsMultipleCandidates } from "@/lib/committeeTypes"
import { computeSetupChecklist } from "@/lib/comms/interview"

const STEP_ICON: Record<string, LucideIcon> = {
  voice: ClipboardList,
  topics: Lightbulb,
  context: BookOpen,
}

export default async function CommunicationsOverview() {
  const { candidate, committee, campaign: activeCampaign } = await requireActiveCampaign()

  // Multi-candidate committees frame this around the committee's shared voice; a
  // single-candidate committee frames it around the candidate.
  const isCommittee = allowsMultipleCandidates(committee.committeeType)
  const voiceOwner = isCommittee ? "your committee's voice" : `${candidate.candidateName}'s voice`

  // Topics + context are committee-level grounding; generations belong to the run.
  const [topicsCount, generationsCount, positionCount, referenceCount] = await Promise.all([
    prisma.topic.count({ where: { committeeId: committee.id } }),
    prisma.generation.count({ where: { campaignId: activeCampaign.id } }),
    prisma.contextItem.count({ where: { committeeId: committee.id, type: "position" } }),
    prisma.contextItem.count({ where: { committeeId: committee.id, type: "reference" } }),
  ])

  const checklist = computeSetupChecklist({
    isCommittee,
    whyRunning: committee.whyRunning,
    bio: candidate.bio,
    experience: committee.experience,
    coreValues: committee.coreValues,
    politicalLean: committee.politicalLean,
    voiceTone: committee.voiceTone,
    topicsCount,
    positionCount,
    referenceCount,
  })
  const complete = checklist.score >= 100

  const learn = [
    {
      href: "/ai/guide",
      icon: GraduationCap,
      label: "Writing Guide",
      desc: "Get the most out of AI-assisted writing in five steps",
    },
    {
      href: "/ai/models",
      icon: Scale,
      label: "Choosing a Model",
      desc: "The same speech from each model — and what the credits buy",
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Communications</h1>
        <p className="mt-1 text-muted-foreground">
          Draft speeches, letters, social posts, and print — in {voiceOwner}.
        </p>
      </div>

      {/* Set up — a transparent checklist of what grounds generation */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Set up</h2>
          <span className="text-xs font-medium text-muted-foreground">
            {complete ? "All set" : `${checklist.doneCount} of ${checklist.total} complete`}
          </span>
        </div>

        {complete ? (
          <p className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#1e6b3a]">
            <Check className="h-4 w-4" /> Setup complete — you&rsquo;re ready to generate great content.
          </p>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              To help produce content, complete the setup steps below.
            </p>
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#f0b429] to-[#c4910a] transition-all"
                style={{ width: `${checklist.score}%` }}
              />
            </div>
          </>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {checklist.steps.map((step) => {
            const Icon = STEP_ICON[step.id]
            return (
              <div key={step.id} className="rounded-xl border border-border bg-white p-5">
                <Link href={step.href} className="group inline-flex items-center gap-2">
                  <Icon className="h-5 w-5 text-[#1b3a6b]" />
                  <h3 className="font-semibold text-[#1a1a2e] group-hover:text-[#1b3a6b] group-hover:underline">
                    {step.label}
                  </h3>
                </Link>
                <ul className="mt-3 space-y-1.5">
                  {step.items.map((item) => (
                    <li key={item.label} className="flex items-start gap-2 text-sm">
                      {item.done ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1e6b3a]" />
                      ) : (
                        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
                      )}
                      <span className={item.done ? "text-[#1a1a2e]" : "text-muted-foreground"}>
                        {item.label}
                        {item.optional && <span className="text-muted-foreground/70"> (optional)</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>

      {/* Learn */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Learn
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {learn.map((l) => {
            const Icon = l.icon
            return (
              <Link
                key={l.href}
                href={l.href}
                className="group flex items-start gap-4 rounded-xl border border-border bg-white p-5 transition-colors hover:border-[#1b3a6b]/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1b3a6b]/5 text-[#1b3a6b] transition-colors group-hover:bg-[#1b3a6b] group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1a1a2e]">{l.label}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{l.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {generationsCount > 0 && (
        <p className="text-sm text-muted-foreground">
          <Check className="mr-1 inline h-4 w-4 text-[#1e6b3a]" />
          {generationsCount} saved communication{generationsCount === 1 ? "" : "s"} across your media pages.
        </p>
      )}
    </div>
  )
}
