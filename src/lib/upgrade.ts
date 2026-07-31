/**
 * In-app upsell content for locked modules. Name / icon / unlock-plan come from
 * the nav model (lib/nav.ts); this adds the value bullets and a link to the full
 * marketing pillar page where one exists.
 */
export interface UpgradeHighlight {
  bullets: string[]
  /** Full marketing overview, when a /platform pillar page exists. */
  marketingHref?: string
}

export const UPGRADE_HIGHLIGHTS: Record<string, UpgradeHighlight> = {
  voters: {
    bullets: [
      "Search and filter your district's registered voters",
      "Build targeted lists by turnout, party, geography, and more",
      "The foundation your outreach and canvassing run on",
    ],
  },
  "voter-outreach": {
    bullets: [
      "Reach the right voters with targeted email and text",
      "Target straight from the voter file — turnout, geography, support",
      "Track opens, clicks, and replies in one place",
    ],
    marketingHref: "/platform/voter-outreach",
  },
  "field-tools": {
    bullets: [
      "Cut turf and assign walk lists in minutes",
      "Organize canvasses and track every door knocked",
      "See volunteer activity as it happens",
    ],
    marketingHref: "/platform/field-tools",
  },
  fundraising: {
    bullets: [
      "Find proven donors in state and federal records",
      "Research who funds similar campaigns",
      "Link donors straight into your CRM",
    ],
    marketingHref: "/platform/fundraising",
  },
  "multi-candidate": {
    bullets: [
      "Manage multiple candidates from one committee",
      "A shared slate website and voter data",
      "Roll up reporting across the whole slate",
    ],
  },
}
