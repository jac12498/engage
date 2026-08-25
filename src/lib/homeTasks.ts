import "server-only"
import { prisma } from "@/lib/prisma"
import { isDevEnv } from "@/lib/appEnv"

export interface HomeTask {
  id: string
  title: string
  detail: string
  href: string
  cta: string
  done: boolean
}

export interface HomeData {
  candidateName: string
  tasks: HomeTask[]
  doneCount: number
  total: number
}

/**
 * Deterministic "next steps" for the guided home. Every task is derived from real
 * account state (never guessed), so the checklist is always accurate. An AI
 * assistant can layer on top of this later to prioritize / act on these.
 */
export async function computeHomeTasks(
  candidateId: string,
  campaignId: string,
  committeeId: string
): Promise<HomeData | null> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { candidateName: true, bio: true, headshotMime: true },
  })
  if (!candidate) return null

  // `whyRunning` is committee-level grounding (Phase 1).
  const committee = await prisma.committee.findUnique({
    where: { id: committeeId },
    select: { whyRunning: true },
  })

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { mailingStreet: true, mailingCity: true, mailingState: true, mailingZip: true },
  })

  // The website is committee-owned (2b-2).
  const site = await prisma.website.findUnique({
    where: { committeeId },
    select: { published: true },
  })

  const [generations, contacts, newsletters] = await Promise.all([
    prisma.generation.count({ where: { campaignId } }),
    // Contacts are committee-wide (shared CRM across the committee's candidates).
    prisma.contact.count({ where: { committeeId } }),
    prisma.newsletter.count({ where: { campaignId } }),
  ])

  const hasProfile = Boolean(candidate.bio?.trim() && committee?.whyRunning?.trim())
  const hasAddress = Boolean(
    campaign?.mailingStreet?.trim() &&
      campaign?.mailingCity?.trim() &&
      campaign?.mailingState?.trim() &&
      campaign?.mailingZip?.trim()
  )
  const hasHeadshot = Boolean(candidate.headshotMime)
  const hasSite = Boolean(site)
  const sitePublished = Boolean(site?.published)

  const tasks: HomeTask[] = [
    {
      id: "profile",
      title: "Complete your candidate profile",
      detail: "Add your bio and why you're running so every draft sounds like you.",
      href: "/settings",
      cta: "Complete profile",
      done: hasProfile,
    },
    {
      id: "headshot",
      title: "Add a candidate headshot",
      detail: "Used on your website and materials. Optional, but it makes everything look finished.",
      href: "/settings",
      cta: "Add photo",
      done: hasHeadshot,
    },
    {
      id: "communication",
      title: "Write your first communication",
      detail: "Draft a letter, op-ed, or social post in your voice with Communications.",
      href: "/communications",
      cta: "Open Communications",
      done: generations > 0,
    },
    {
      id: "website",
      title: hasSite ? "Publish your website" : "Build your campaign website",
      detail: hasSite
        ? "Your site is a draft — publish it to make it live for voters."
        : "Generate a polished, mobile-ready site from your profile in minutes.",
      href: "/website",
      cta: hasSite ? "Publish site" : "Build website",
      done: hasSite && sitePublished,
    },
    {
      id: "contacts",
      title: "Add your contacts",
      detail: "Bring in supporters, donors, and volunteers so outreach has somewhere to go.",
      href: "/contacts",
      cta: "Add contacts",
      done: contacts > 0,
    },
    {
      id: "address",
      title: "Add your committee mailing address",
      detail: "A postal address is legally required before you can email a newsletter (CAN-SPAM).",
      href: "/settings",
      cta: "Add address",
      done: hasAddress,
    },
    {
      id: "newsletter",
      title: "Start your newsletter",
      detail: "Write your first issue and grow a list of supporters you can reach any time.",
      href: "/newsletters",
      cta: "Open Newsletter",
      done: newsletters > 0,
    },
  ]

  // The website builder is dev-only while it's reworked — drop its task in prod.
  const visible = isDevEnv() ? tasks : tasks.filter((t) => t.id !== "website")

  // Incomplete first (preserving relative order), completed after.
  visible.sort((a, b) => Number(a.done) - Number(b.done))
  const doneCount = visible.filter((t) => t.done).length

  return { candidateName: candidate.candidateName, tasks: visible, doneCount, total: visible.length }
}
