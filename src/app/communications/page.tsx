import Link from "next/link"
import { redirect } from "next/navigation"
import { ClipboardList, BookOpen, Lightbulb, ArrowRight, Check } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { computeKnowledge } from "@/lib/comms/interview"
import { MEDIA, MEDIUM_LABELS } from "@/lib/comms/prompts"

export default async function CommunicationsOverview() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      candidateName: true,
      bio: true,
      whyRunning: true,
      experience: true,
      education: true,
      coreValues: true,
      politicalLean: true,
      voiceTone: true,
      _count: { select: { topics: true, contextItems: true, generations: true } },
    },
  })
  if (!campaign) redirect("/onboarding")

  const counts = campaign._count
  const [positionCount, referenceCount] = await Promise.all([
    prisma.contextItem.count({ where: { campaignId: campaign.id, type: "position" } }),
    prisma.contextItem.count({ where: { campaignId: campaign.id, type: "reference" } }),
  ])

  const knowledge = computeKnowledge({
    bio: campaign.bio,
    whyRunning: campaign.whyRunning,
    experience: campaign.experience,
    education: campaign.education,
    coreValues: campaign.coreValues,
    politicalLean: campaign.politicalLean,
    voiceTone: campaign.voiceTone,
    issuesCount: positionCount,
    newsCount: referenceCount,
  })

  const setup = [
    {
      href: "/communications/interview",
      icon: ClipboardList,
      label: "Interview",
      desc: "Who you are, your values, your voice",
      meta: `${knowledge.score}% complete`,
    },
    {
      href: "/communications/topics",
      icon: Lightbulb,
      label: "Topics",
      desc: "Hot topics you want to write about",
      meta: `${counts.topics} topic${counts.topics === 1 ? "" : "s"}`,
    },
    {
      href: "/communications/context",
      icon: BookOpen,
      label: "Context",
      desc: "Notes, positions & references that ground your drafts",
      meta: `${counts.contextItems} item${counts.contextItems === 1 ? "" : "s"}`,
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">AI Communications</h1>
        <p className="mt-1 text-muted-foreground">
          Draft speeches, letters, social posts, and print — in {campaign.candidateName}&apos;s voice.
        </p>
      </div>

      {/* Knowledge meter */}
      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
              Campaign knowledge
            </h2>
            <p className="mt-1 text-2xl font-bold text-[#1a1a2e]">{knowledge.score}% complete</p>
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            The more we know, the more every draft sounds like you — not a generic politician.
          </p>
        </div>
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#f0b429] to-[#c4910a] transition-all"
            style={{ width: `${knowledge.score}%` }}
          />
        </div>
      </div>

      {/* Set up */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Set up
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {setup.map((s) => {
            const Icon = s.icon
            return (
              <Link
                key={s.href}
                href={s.href}
                className="group rounded-xl border border-border bg-white p-5 transition-colors hover:border-[#1b3a6b]/40"
              >
                <Icon className="h-5 w-5 text-[#1b3a6b]" />
                <h3 className="mt-3 font-semibold text-[#1a1a2e]">{s.label}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{s.desc}</p>
                <p className="mt-2 text-xs font-medium text-[#c4910a]">{s.meta}</p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Create */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Create
        </h2>
        {!knowledge.ready && (
          <p className="mb-3 rounded-lg border border-[#c4910a]/30 bg-[#f0b429]/10 px-4 py-2.5 text-sm text-[#7a5a00]">
            Tip: finish the{" "}
            <Link href="/communications/interview" className="font-semibold underline">
              interview
            </Link>{" "}
            and add an issue or two in{" "}
            <Link href="/communications/context" className="font-semibold underline">
              Context
            </Link>{" "}
            for much stronger drafts.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MEDIA.map((m) => (
            <Link
              key={m}
              href={`/communications/${m === "social" ? "social" : m}`}
              className="group flex items-center justify-between rounded-xl border border-border bg-white p-5 transition-colors hover:border-[#1b3a6b]/40"
            >
              <span className="font-semibold text-[#1a1a2e]">{MEDIUM_LABELS[m]}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </div>

      {counts.generations > 0 && (
        <p className="text-sm text-muted-foreground">
          <Check className="mr-1 inline h-4 w-4 text-[#1e6b3a]" />
          {counts.generations} saved communication{counts.generations === 1 ? "" : "s"} across your media pages.
        </p>
      )}
    </div>
  )
}
