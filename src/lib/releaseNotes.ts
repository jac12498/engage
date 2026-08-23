/**
 * Release notes — the single source of truth for the user-facing changelog.
 *
 * This is a plain data module (no server-only import) so both the server page
 * (`/release-notes`) and the client sidebar can read it. Keep newest first.
 *
 * When you ship a user-visible change, bump `APP_VERSION` and prepend a new
 * `Release` here in the same commit as the change. Group items under "New",
 * "Improved", or "Fixed". Write for users, not developers — describe the
 * capability, not the code.
 */

export const APP_VERSION = "1.2"

export type ChangeKind = "New" | "Improved" | "Fixed"

export interface ReleaseSection {
  kind: ChangeKind
  items: string[]
}

export interface Release {
  version: string
  /** ISO date (yyyy-mm-dd) the release shipped. */
  date: string
  /** Optional short headline for the release. */
  title?: string
  /** Optional one- or two-sentence summary shown under the heading. */
  summary?: string
  sections: ReleaseSection[]
}

export const RELEASES: Release[] = [
  {
    version: "1.2",
    date: "2026-08-23",
    title: "A better Contacts list",
    summary: "The Contacts list is easier to scan, search, and organize.",
    sections: [
      {
        kind: "New",
        items: [
          "Jump to a letter: filter contacts by the first letter of their last name.",
          "Page through your contacts 10, 50, or 100 at a time.",
          "Filter by more than one tag at once.",
        ],
      },
      {
        kind: "Improved",
        items: [
          "Contacts are now sorted by last name and shown as “Last, First”, with clearer clickable names.",
          "Addresses appear on two lines (street, then city/state/ZIP) and phone numbers are formatted as xxx-xxx-xxxx.",
          "Contact “Types” are now called “Tags”.",
          "Deleting a contact now asks you to confirm first.",
        ],
      },
    ],
  },
  {
    version: "1.1",
    date: "2026-08-22",
    title: "What's New page",
    summary: "You can now keep up with platform updates right inside Engage.",
    sections: [
      {
        kind: "New",
        items: [
          "Release notes: a “What’s new” link in the sidebar opens this page, listing new features, improvements, and fixes as they ship. A badge on the link tells you when there’s something you haven’t read yet.",
        ],
      },
    ],
  },
  {
    version: "1.0",
    date: "2026-08-22",
    title: "Engage 1.0",
    summary:
      "The first public release of Engage — an all-in-one platform for political committees and their candidates to communicate, organize, and grow support.",
    sections: [
      {
        kind: "New",
        items: [
          "Committee workspaces: organize your work as Committee → Candidate → Campaign, switch between committees you belong to, and invite teammates with role-based permissions.",
          "AI Communications: draft speeches, letters, social posts, print pieces, and newsletter articles grounded in your campaign's topics, positions, and recent news — with a choice of AI models.",
          "Website: generate a committee or candidate website from your profile, edit it in the in-app builder, and publish a public site with a volunteer signup form.",
          "Newsletter: write and send email newsletters, manage a committee-wide subscriber list with double opt-in, and keep a public archive.",
          "Contacts / CRM: keep a searchable contact list, capture volunteer signups from your website, and organize supporters by type.",
          "In the News: automatically discover press coverage of your candidates and feature it on your site.",
          "Campaign finance & registration: look up your committee by state Filer ID to auto-fill registration details, and see campaign-finance data.",
          "Assets: store your committee and candidate logos, slogan, ActBlue/donate link, website link, and mailing address once and reuse them across the platform.",
        ],
      },
    ],
  },
]
