"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { type Prisma } from "@/generated/prisma/client"
import { getActiveContext } from "@/lib/context"
import { allowsMultipleCandidates } from "@/lib/committeeTypes"
import { generateWebsiteDraft } from "@/lib/website/generate"
import { draftToHomeBlocks, type BlockInput } from "@/lib/website/draftToBlocks"
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

// ─── First-run generation ────────────────────────────────────────────────────

export async function generateSite(): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
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

  const blocks = draftToHomeBlocks(result.draft, { donateUrl: null, multiCandidate: result.multiCandidate })
  const slug = await uniqueSlug(committee.name)
  await prisma.website.create({
    data: {
      committeeId: committee.id,
      siteTitle: committee.name,
      paidForBy: committee.name,
      slug,
      pages: {
        create: {
          slug: "home",
          title: "Home",
          navOrder: 0,
          showInNav: true,
          published: true,
          isHome: true,
          blocks: { create: blockCreateData(blocks) },
        },
      },
    },
  })

  revalidatePath("/website")
  return { ok: true, slug }
}

/**
 * Re-run the AI draft, replacing the Home page's blocks but keeping theme, slug, site
 * links, publish state, and any pages/blocks the candidate added manually.
 */
export async function regenerateSite(): Promise<{ ok: true } | { ok: false; error: string }> {
  const committee = await currentCommittee()
  if (!committee) return { ok: false, error: "No committee found." }
  const site = await prisma.website.findUnique({
    where: { committeeId: committee.id },
    select: { id: true, donateUrl: true },
  })
  if (!site) return { ok: false, error: "No website to regenerate." }

  let result
  try {
    result = await draftForCommittee(committee.id, committee.name)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Generation failed." }
  }

  const blocks = draftToHomeBlocks(result.draft, { donateUrl: site.donateUrl, multiCandidate: result.multiCandidate })
  const home = await prisma.page.findFirst({
    where: { websiteId: site.id, isHome: true },
    select: { id: true },
  })

  if (home) {
    await prisma.$transaction([
      prisma.block.deleteMany({ where: { pageId: home.id } }),
      prisma.block.createMany({
        data: blockCreateData(blocks).map((b) => ({ ...b, pageId: home.id })),
      }),
    ])
  } else {
    // Defensive: a site with no Home page (shouldn't happen post-backfill) — recreate it.
    await prisma.page.create({
      data: {
        websiteId: site.id,
        slug: "home",
        title: "Home",
        isHome: true,
        blocks: { create: blockCreateData(blocks) },
      },
    })
  }

  revalidatePath("/website")
  revalidatePath(`/websites/${committee.id}`)
  return { ok: true }
}

// ─── Publish toggle (kept) ───────────────────────────────────────────────────

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
