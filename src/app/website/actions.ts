"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { type Prisma } from "@/generated/prisma/client"
import { getActiveContext } from "@/lib/context"
import { allowsMultipleCandidates } from "@/lib/committeeTypes"
import { BLOCK_SPECS } from "@/lib/website/blocks"
import { generateWebsiteDraft } from "@/lib/website/generate"
import { draftToHomeBlocks, type BlockInput } from "@/lib/website/draftToBlocks"
import { loadSiteGrounding, type SiteGrounding } from "@/lib/website/aiActions"
import { slugify } from "@/lib/website/slug"

/** The active committee (editor role required — website work is a mutation). The site
 *  is committee-owned (2b-2). */
async function currentCommittee() {
  const ctx = await getActiveContext()
  if (!ctx || !ctx.permissions.has("candidate-websites:update")) return null
  return ctx.committee
}

/** Free site slug derived from `base`, appending -2, -3… on collision. */
async function uniqueSlug(base: string, excludeWebsiteId?: string): Promise<string> {
  const root = slugify(base)
  let candidate = root
  let n = 1
  for (;;) {
    const existing = await prisma.website.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!existing || existing.id === excludeWebsiteId) return candidate
    n += 1
    candidate = `${root}-${n}`
  }
}

function blockCreateData(blocks: BlockInput[]) {
  return blocks.map((b, i) => ({ type: b.type, order: i, props: b.props as Prisma.InputJsonValue }))
}

/** Draft the committee home from its candidates + their positions/topics. */
async function draftForCommittee(committeeId: string, committeeName: string) {
  // Grounding (whyRunning/coreValues) + positions + topics are committee-level (Phase 1).
  const [committee, candidates, positions, topics] = await Promise.all([
    prisma.committee.findUnique({
      where: { id: committeeId },
      select: { whyRunning: true, coreValues: true, committeeType: true },
    }),
    prisma.candidate.findMany({
      where: { committeeId },
      orderBy: { createdAt: "asc" },
      select: {
        candidateName: true,
        bio: true,
        campaigns: { orderBy: [{ cycle: "desc" }], take: 1, select: { id: true, office: true, party: true } },
      },
    }),
    prisma.contextItem.findMany({
      where: { committeeId, type: "position" },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
    prisma.topic.findMany({ where: { committeeId }, orderBy: { updatedAt: "desc" } }),
  ])
  // A committee is a "party" site by its TYPE (party/multi-candidate), not by how
  // many candidates it has entered yet — a multi-candidate committee with one
  // candidate should still get the committee-focused site.
  const multiCandidate = allowsMultipleCandidates(committee?.committeeType)

  const draft = await generateWebsiteDraft(
    {
      committeeName,
      multiCandidate,
      candidates: candidates.map((c) => ({
        candidateName: c.candidateName,
        office: c.campaigns[0]?.office ?? "",
        party: c.campaigns[0]?.party ?? null,
        bio: c.bio,
        whyRunning: committee?.whyRunning ?? null,
        coreValues: committee?.coreValues ?? null,
      })),
    },
    positions.map((p) => ({ title: p.title ?? "", body: p.body, keyPoints: p.keyPoints })),
    topics.map((t) => ({ title: t.title, keyMessage: t.keyMessage, talkingPoints: t.talkingPoints }))
  )
  draft.heroHeadline = draft.heroHeadline || committeeName
  return { draft, multiCandidate }
}

// ─── First-run: two starting points ──────────────────────────────────────────

interface ScaffoldPage {
  title: string
  slug: string
  blocks: BlockInput[]
}

/**
 * Extra pages beyond Home, seeded deterministically from the committee's grounding
 * (bio / mission / values / positions) — real content, no extra model calls. The
 * Home page carries the AI-drafted copy; these give a genuine multi-page starting
 * point the user then refines (per-section) with the Phase C AI actions.
 */
function scaffoldExtraPages(g: SiteGrounding, multi: boolean): ScaffoldPage[] {
  const pages: ScaffoldPage[] = []

  // About — committee mission/values, or the candidate's bio.
  const aboutBody = multi
    ? [g.whyRunning, g.coreValues].filter((v) => v && v.trim()).join("\n\n")
    : (g.candidates[0]?.bio || g.whyRunning || "").trim()
  if (aboutBody.trim()) {
    pages.push({
      title: "About",
      slug: "about",
      blocks: [
        {
          type: "richText",
          props: BLOCK_SPECS.richText.validate({
            heading: multi ? "About the committee" : "About",
            body: aboutBody,
          }),
        },
      ],
    })
  }

  // Issues — one card per standing position.
  const issueItems = g.positions
    .map((p) => ({ title: p.title, body: p.body || p.keyPoints.join(" ") }))
    .filter((i) => i.title && i.body)
  if (issueItems.length) {
    pages.push({
      title: "Issues",
      slug: "issues",
      blocks: [
        {
          type: "issuesGrid",
          props: BLOCK_SPECS.issuesGrid.validate({
            heading: multi ? "What we stand for" : "Where I stand",
            items: issueItems,
          }),
        },
      ],
    })
  }

  // Get involved — volunteer form + newsletter signup (donate band added once a
  // donate link exists on the site).
  pages.push({
    title: "Get involved",
    slug: "get-involved",
    blocks: [
      {
        type: "volunteerForm",
        props: BLOCK_SPECS.volunteerForm.validate({
          heading: "Get involved",
          intro: "Join us — knock doors, make calls, or host an event.",
        }),
      },
      {
        type: "newsletterSignup",
        props: BLOCK_SPECS.newsletterSignup.validate({
          heading: "Stay connected",
          intro: "Get news, events, and ways to help — right in your inbox.",
        }),
      },
    ],
  })

  return pages
}

function pageCreateData(page: { slug: string; title: string; isHome: boolean }, navOrder: number, blocks: BlockInput[]) {
  return {
    slug: page.slug,
    title: page.title,
    navOrder,
    showInNav: true,
    published: true,
    isHome: page.isHome,
    blocks: { create: blockCreateData(blocks) },
  }
}

/**
 * Scaffold a starter site with AI: an AI-drafted Home page plus About / Issues /
 * Get-involved pages seeded from the committee's grounding. The user then refines.
 */
export async function scaffoldSite(): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const committee = await currentCommittee()
  if (!committee) return { ok: false, error: "No committee found." }

  const existing = await prisma.website.findUnique({
    where: { committeeId: committee.id },
    select: { id: true },
  })
  if (existing) return { ok: false, error: "A website already exists for this committee." }

  let result
  try {
    result = await draftForCommittee(committee.id, committee.name)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Generation failed." }
  }

  const homeBlocks = draftToHomeBlocks(result.draft, { donateUrl: null, multiCandidate: result.multiCandidate })
  const grounding = await loadSiteGrounding(committee.id)
  const extra = scaffoldExtraPages(grounding, result.multiCandidate)

  const slug = await uniqueSlug(committee.name)
  await prisma.website.create({
    data: {
      committeeId: committee.id,
      siteTitle: committee.name,
      paidForBy: committee.name,
      slug,
      pages: {
        create: [
          pageCreateData({ slug: "home", title: "Home", isHome: true }, 0, homeBlocks),
          ...extra.map((p, i) => pageCreateData({ slug: p.slug, title: p.title, isHome: false }, i + 1, p.blocks)),
        ],
      },
    },
  })

  revalidatePath("/website")
  return { ok: true, slug }
}

/** Start from scratch: an empty site with a single Home page (one hero to edit). */
export async function createBlankSite(): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const committee = await currentCommittee()
  if (!committee) return { ok: false, error: "No committee found." }

  const existing = await prisma.website.findUnique({
    where: { committeeId: committee.id },
    select: { id: true },
  })
  if (existing) return { ok: false, error: "A website already exists for this committee." }

  const hero: BlockInput = {
    type: "hero",
    props: BLOCK_SPECS.hero.validate({ headline: committee.name, showHeadshot: true }),
  }
  const slug = await uniqueSlug(committee.name)
  await prisma.website.create({
    data: {
      committeeId: committee.id,
      siteTitle: committee.name,
      paidForBy: committee.name,
      slug,
      pages: { create: pageCreateData({ slug: "home", title: "Home", isHome: true }, 0, [hero]) },
    },
  })

  revalidatePath("/website")
  return { ok: true, slug }
}

// ─── Publish toggle ──────────────────────────────────────────────────────────

export async function setPublished(published: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const committee = await currentCommittee()
  if (!committee) return { ok: false, error: "No committee found." }
  const site = await prisma.website.findUnique({
    where: { committeeId: committee.id },
    select: { id: true },
  })
  if (!site) return { ok: false, error: "No website found." }

  await prisma.website.update({ where: { id: site.id }, data: { published } })
  revalidatePath("/website")
  revalidatePath(`/websites/${committee.id}`)
  return { ok: true }
}
