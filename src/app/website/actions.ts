"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { type Prisma } from "@/generated/prisma/client"
import { generateWebsiteDraft } from "@/lib/website/generate"
import { draftToHomeBlocks, type BlockInput } from "@/lib/website/draftToBlocks"
import { slugify } from "@/lib/website/slug"

async function currentCampaign() {
  const session = await auth()
  if (!session?.user?.id) return null
  return prisma.campaign.findUnique({ where: { userId: session.user.id } })
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

async function draftForCampaign(campaignId: string) {
  const [campaign, positions, topics] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: campaignId } }),
    prisma.contextItem.findMany({
      where: { campaignId, type: "position" },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
    prisma.topic.findMany({ where: { campaignId }, orderBy: { updatedAt: "desc" } }),
  ])
  if (!campaign) throw new Error("No campaign found.")
  const draft = await generateWebsiteDraft(
    campaign,
    positions.map((p) => ({ title: p.title ?? "", body: p.body, keyPoints: p.keyPoints })),
    topics.map((t) => ({ title: t.title, keyMessage: t.keyMessage, talkingPoints: t.talkingPoints }))
  )
  draft.heroHeadline = draft.heroHeadline || campaign.candidateName
  return draft
}

// ─── First-run generation ────────────────────────────────────────────────────

export async function generateSite(): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const campaign = await currentCampaign()
  if (!campaign) return { ok: false, error: "No campaign found." }

  const existing = await prisma.website.findUnique({
    where: { campaignId: campaign.id },
    select: { id: true },
  })
  if (existing) return { ok: false, error: "A website already exists for this campaign." }

  let draft
  try {
    draft = await draftForCampaign(campaign.id)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Generation failed." }
  }

  const blocks = draftToHomeBlocks(draft, { donateUrl: null })
  const slug = await uniqueSlug(campaign.candidateName)
  await prisma.website.create({
    data: {
      campaignId: campaign.id,
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
  const campaign = await currentCampaign()
  if (!campaign) return { ok: false, error: "No campaign found." }
  const site = await prisma.website.findUnique({
    where: { campaignId: campaign.id },
    select: { id: true, donateUrl: true },
  })
  if (!site) return { ok: false, error: "No website to regenerate." }

  let draft
  try {
    draft = await draftForCampaign(campaign.id)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Generation failed." }
  }

  const blocks = draftToHomeBlocks(draft, { donateUrl: site.donateUrl })
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
  revalidatePath(`/websites/${campaign.id}`)
  return { ok: true }
}

// ─── Publish toggle (kept) ───────────────────────────────────────────────────

export async function setPublished(published: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const campaign = await currentCampaign()
  if (!campaign) return { ok: false, error: "No campaign found." }
  const site = await prisma.website.findUnique({
    where: { campaignId: campaign.id },
    select: { id: true },
  })
  if (!site) return { ok: false, error: "No website found." }

  await prisma.website.update({ where: { id: site.id }, data: { published } })
  revalidatePath("/website")
  revalidatePath(`/websites/${campaign.id}`)
  return { ok: true }
}
