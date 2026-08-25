import type { WebsiteDraft } from "./generate"
import { BLOCK_SPECS } from "./blocks"

export interface BlockInput {
  type: string
  props: unknown
}

/**
 * Map an AI-generated WebsiteDraft into the Home page's block list.
 *
 * Single-candidate committees get a candidate-centered page:
 *   hero → richText(About) → issuesGrid("Where I stand") → volunteerForm
 *
 * Multi-candidate (party) committees get an organization landing modeled on real
 * county-party committee sites — leading with the slate, then the committee's
 * mission, its shared platform, and the ways to help:
 *   hero → candidates → richText(Who we are) → issuesGrid(What we stand for)
 *        → volunteerForm → cta(Donate) → newsFeed → newsletterSignup
 * The candidates / newsFeed blocks are dynamic and render nothing until there's
 * content, so a fresh site never shows an empty section.
 *
 * Regeneration replaces only these Home blocks, preserving user-added pages.
 */
export function draftToHomeBlocks(
  draft: WebsiteDraft,
  opts: { donateUrl?: string | null; multiCandidate?: boolean } = {}
): BlockInput[] {
  const blocks: BlockInput[] = []
  const multi = !!opts.multiCandidate

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

  // candidates — the slate, placed prominently right after the hero for a party
  // committee. Dynamic: lists the committee's candidates, each linking to their page.
  if (multi) {
    const cb: Record<string, unknown> = { heading: "Meet our candidates" }
    if (draft.candidatesIntro) cb.intro = draft.candidatesIntro
    blocks.push({ type: "candidates", props: BLOCK_SPECS.candidates.validate(cb) })
  }

  // richText (About / Who we are)
  if (draft.aboutBody || draft.aboutHeading) {
    const rt: Record<string, unknown> = {
      body: draft.aboutBody,
      heading: draft.aboutHeading || (multi ? "Who we are" : "About"),
    }
    blocks.push({ type: "richText", props: BLOCK_SPECS.richText.validate(rt) })
  }

  // issuesGrid
  if (draft.issues.length > 0) {
    const ig: Record<string, unknown> = {
      heading: multi ? "What we stand for" : "Where I stand",
      items: draft.issues.map((i) => ({ title: i.title, body: i.body })),
    }
    if (draft.issuesIntro) ig.intro = draft.issuesIntro
    blocks.push({ type: "issuesGrid", props: BLOCK_SPECS.issuesGrid.validate(ig) })
  }

  // volunteerForm (anchor target of the hero primary CTA)
  const vf: Record<string, unknown> = { heading: "Get involved" }
  if (draft.volunteerIntro) vf.intro = draft.volunteerIntro
  blocks.push({ type: "volunteerForm", props: BLOCK_SPECS.volunteerForm.validate(vf) })

  // Party-site chrome: a donate band, a dynamic news feed (empty until pieces are
  // published), and a newsletter signup — the pieces real committee homepages carry.
  if (multi) {
    if (opts.donateUrl) {
      blocks.push({
        type: "cta",
        props: BLOCK_SPECS.cta.validate({
          heading: "Power our work",
          text: "Grassroots support keeps our candidates competitive. Chip in what you can.",
          buttonLabel: "Donate",
          href: opts.donateUrl,
        }),
      })
    }
    blocks.push({ type: "newsFeed", props: BLOCK_SPECS.newsFeed.validate({ heading: "News & updates" }) })
    blocks.push({
      type: "newsletterSignup",
      props: BLOCK_SPECS.newsletterSignup.validate({
        heading: "Stay connected",
        intro: "Get committee news, events, and ways to help — right in your inbox.",
      }),
    })
  }

  return blocks
}
