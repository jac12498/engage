import type { WebsiteDraft } from "./generate"
import { BLOCK_SPECS } from "./blocks"

export interface BlockInput {
  type: string
  props: unknown
}

/**
 * Map an AI-generated WebsiteDraft (the legacy column shape) into the Home page's
 * block list: hero → richText(About) → issuesGrid → volunteerForm. Each block's props
 * are run through the block validator so what we persist is already normalized + safe.
 *
 * Phase 1 only produces the Home page; multi-page authoring is manual (the block CRUD
 * actions). Regeneration replaces only these Home blocks, preserving user-added pages.
 */
export function draftToHomeBlocks(
  draft: WebsiteDraft,
  opts: { donateUrl?: string | null; multiCandidate?: boolean } = {}
): BlockInput[] {
  const blocks: BlockInput[] = []

  // hero — showHeadshot stays true; the renderer only shows the image (the committee
  // logo) when one exists, so uploading a logo later "just works".
  const hero: Record<string, unknown> = {
    headline: draft.heroHeadline,
    showHeadshot: true,
    primaryCta: { label: "Get involved", href: "#volunteer" },
  }
  if (draft.heroSubhead) hero.subhead = draft.heroSubhead
  if (opts.donateUrl) hero.secondaryCta = { label: "Donate", href: opts.donateUrl }
  blocks.push({ type: "hero", props: BLOCK_SPECS.hero.validate(hero) })

  // richText (About)
  if (draft.aboutBody || draft.aboutHeading) {
    const rt: Record<string, unknown> = { body: draft.aboutBody }
    if (draft.aboutHeading) rt.heading = draft.aboutHeading
    blocks.push({ type: "richText", props: BLOCK_SPECS.richText.validate(rt) })
  }

  // candidates — the slate (multi-candidate committees). Dynamic: lists the committee's
  // candidates, each linking to their profile page.
  if (opts.multiCandidate) {
    const cb: Record<string, unknown> = { heading: "Our candidates" }
    if (draft.candidatesIntro) cb.intro = draft.candidatesIntro
    blocks.push({ type: "candidates", props: BLOCK_SPECS.candidates.validate(cb) })
  }

  // issuesGrid
  if (draft.issues.length > 0) {
    const ig: Record<string, unknown> = {
      heading: opts.multiCandidate ? "Our priorities" : "Where I stand",
      items: draft.issues.map((i) => ({ title: i.title, body: i.body })),
    }
    if (draft.issuesIntro) ig.intro = draft.issuesIntro
    blocks.push({ type: "issuesGrid", props: BLOCK_SPECS.issuesGrid.validate(ig) })
  }

  // volunteerForm (anchor target of the hero primary CTA)
  const vf: Record<string, unknown> = { heading: "Get involved" }
  if (draft.volunteerIntro) vf.intro = draft.volunteerIntro
  blocks.push({ type: "volunteerForm", props: BLOCK_SPECS.volunteerForm.validate(vf) })

  return blocks
}
