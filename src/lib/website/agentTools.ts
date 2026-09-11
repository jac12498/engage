import "server-only"
import type Anthropic from "@anthropic-ai/sdk"
import { BLOCK_ORDER, BLOCK_SPECS } from "@/lib/website/blocks"
import {
  svcCreatePage,
  svcUpdatePage,
  svcDeletePage,
  svcReorderPages,
  svcAddBlock,
  svcUpdateBlockProps,
  svcMoveBlock,
  svcDeleteBlock,
  svcUpdateSiteSettings,
  getSiteSnapshot,
} from "@/lib/website/blockService"

// The conversational builder exposes the block/page/site service as Claude tools.
// Each tool maps to exactly one `svc*` function (validated + ownership-checked), so
// the agent can only make the same safe edits the manual editor can.

const blockTypeEnum = BLOCK_ORDER as unknown as string[]

export const WEBSITE_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_site",
    description:
      "Return the current site as JSON: every page (id, slug, title, isHome, published, showInNav) with its ordered blocks (id, type, props), plus theme and links. Call this first if you're unsure of current ids or content.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "create_page",
    description: "Create a new page. Returns its pageId. The page starts empty — add blocks to it.",
    input_schema: {
      type: "object",
      properties: { title: { type: "string", description: "Nav label / page title, e.g. \"Endorsements\"." } },
      required: ["title"],
    },
  },
  {
    name: "update_page",
    description: "Update a page's title, nav visibility, or published state.",
    input_schema: {
      type: "object",
      properties: {
        pageId: { type: "string" },
        title: { type: "string" },
        showInNav: { type: "boolean", description: "Whether the page appears in the nav bar." },
        published: { type: "boolean", description: "Draft a page (false) without unpublishing the whole site." },
      },
      required: ["pageId"],
    },
  },
  {
    name: "delete_page",
    description: "Delete a page and all its blocks. The home page cannot be deleted.",
    input_schema: { type: "object", properties: { pageId: { type: "string" } }, required: ["pageId"] },
  },
  {
    name: "reorder_pages",
    description: "Set the nav order of pages. Provide ALL page ids in the desired order.",
    input_schema: {
      type: "object",
      properties: { orderedPageIds: { type: "array", items: { type: "string" } } },
      required: ["orderedPageIds"],
    },
  },
  {
    name: "add_block",
    description:
      "Add a block to a page. `props` is optional; omit it to seed sensible defaults, or provide the full props object for this block type (see the block vocabulary in the system prompt). Returns the new blockId.",
    input_schema: {
      type: "object",
      properties: {
        pageId: { type: "string" },
        type: { type: "string", enum: blockTypeEnum },
        atIndex: { type: "number", description: "0-based position among the page's blocks. Omit to append." },
        props: { type: "object", description: "Full props for this block type. Unknown keys are ignored." },
      },
      required: ["pageId", "type"],
    },
  },
  {
    name: "update_block",
    description:
      "Replace a block's props with the provided object (this overwrites ALL props for the block, so include every field you want to keep — read current props via get_site first). Cannot change a block's type; delete and re-add to change type.",
    input_schema: {
      type: "object",
      properties: {
        blockId: { type: "string" },
        props: { type: "object", description: "The complete desired props for this block type." },
      },
      required: ["blockId", "props"],
    },
  },
  {
    name: "move_block",
    description: "Move a block to a new position (toIndex) on its page, or onto another page (toPageId).",
    input_schema: {
      type: "object",
      properties: {
        blockId: { type: "string" },
        toIndex: { type: "number", description: "0-based target position." },
        toPageId: { type: "string", description: "Optional — move the block to this page." },
      },
      required: ["blockId", "toIndex"],
    },
  },
  {
    name: "delete_block",
    description: "Delete a block.",
    input_schema: { type: "object", properties: { blockId: { type: "string" } }, required: ["blockId"] },
  },
  {
    name: "update_site_settings",
    description:
      "Update site-wide theme and links. Colors are hex (e.g. \"#1b3a6b\"). fontTheme is one of classic|modern|serif. donateUrl is an external http(s) link. Only include the fields you want to change.",
    input_schema: {
      type: "object",
      properties: {
        primaryColor: { type: "string" },
        accentColor: { type: "string" },
        fontTheme: { type: "string", enum: ["classic", "modern", "serif"] },
        donateUrl: { type: "string" },
        contactEmail: { type: "string" },
      },
    },
  },
]

export interface ToolOutcome {
  /** Machine-readable payload fed back to the model as the tool_result. */
  result: unknown
  /** One-line human summary for the chat activity log. null = no visible change (e.g. get_site). */
  summary: string | null
  /** True when this call mutated the site (drives preview refresh + edit-happened tracking). */
  mutated: boolean
}

type Input = Record<string, unknown>
const str = (v: unknown) => (typeof v === "string" ? v : "")
const num = (v: unknown) => (typeof v === "number" ? v : undefined)

/** Execute one tool call against the campaign's site. Never throws — errors come back as data. */
export async function executeTool(campaignId: string, name: string, input: Input): Promise<ToolOutcome> {
  try {
    switch (name) {
      case "get_site": {
        const site = await getSiteSnapshot(campaignId)
        return { result: site ?? { error: "No site." }, summary: null, mutated: false }
      }
      case "create_page": {
        const r = await svcCreatePage(campaignId, str(input.title))
        return { result: r, summary: r.ok ? `Added page “${str(input.title)}”` : `Couldn't add page: ${r.error}`, mutated: r.ok }
      }
      case "update_page": {
        const r = await svcUpdatePage(campaignId, str(input.pageId), {
          title: input.title as string | undefined,
          showInNav: input.showInNav as boolean | undefined,
          published: input.published as boolean | undefined,
        })
        return { result: r, summary: r.ok ? "Updated a page" : `Couldn't update page: ${r.error}`, mutated: r.ok }
      }
      case "delete_page": {
        const r = await svcDeletePage(campaignId, str(input.pageId))
        return { result: r, summary: r.ok ? "Deleted a page" : `Couldn't delete page: ${r.error}`, mutated: r.ok }
      }
      case "reorder_pages": {
        const ids = Array.isArray(input.orderedPageIds) ? (input.orderedPageIds as string[]) : []
        const r = await svcReorderPages(campaignId, ids)
        return { result: r, summary: r.ok ? "Reordered pages" : `Couldn't reorder: ${r.error}`, mutated: r.ok }
      }
      case "add_block": {
        const type = str(input.type)
        const r = await svcAddBlock(campaignId, str(input.pageId), type, num(input.atIndex), input.props)
        const label = BLOCK_SPECS[type as keyof typeof BLOCK_SPECS]?.label ?? type
        return { result: r, summary: r.ok ? `Added a ${label} block` : `Couldn't add block: ${r.error}`, mutated: r.ok }
      }
      case "update_block": {
        const r = await svcUpdateBlockProps(campaignId, str(input.blockId), input.props)
        return { result: r, summary: r.ok ? "Edited a block" : `Couldn't edit block: ${r.error}`, mutated: r.ok }
      }
      case "move_block": {
        const r = await svcMoveBlock(campaignId, str(input.blockId), num(input.toIndex) ?? 0, input.toPageId as string | undefined)
        return { result: r, summary: r.ok ? "Moved a block" : `Couldn't move block: ${r.error}`, mutated: r.ok }
      }
      case "delete_block": {
        const r = await svcDeleteBlock(campaignId, str(input.blockId))
        return { result: r, summary: r.ok ? "Deleted a block" : `Couldn't delete block: ${r.error}`, mutated: r.ok }
      }
      case "update_site_settings": {
        const r = await svcUpdateSiteSettings(campaignId, {
          primaryColor: input.primaryColor as string | undefined,
          accentColor: input.accentColor as string | undefined,
          fontTheme: input.fontTheme as string | undefined,
          donateUrl: input.donateUrl as string | undefined,
          contactEmail: input.contactEmail as string | undefined,
        })
        return { result: r, summary: r.ok ? "Updated theme / links" : `Couldn't update settings: ${r.error}`, mutated: r.ok }
      }
      default:
        return { result: { ok: false, error: `Unknown tool "${name}".` }, summary: null, mutated: false }
    }
  } catch (e) {
    return { result: { ok: false, error: e instanceof Error ? e.message : "Tool failed." }, summary: null, mutated: false }
  }
}

/** The props shape of each block type, for prompting the model to produce valid props. */
export const BLOCK_PROP_SHAPES: Record<string, string> = {
  hero: "{ headline: string, subhead?: string, showHeadshot?: boolean, imageUrl?: string (banner image URL), primaryCta?: {label,href}, secondaryCta?: {label,href} }",
  richText: "{ heading?: string, body: string (plain text; a blank line starts a new paragraph), cta?: {label,href} }",
  image: "{ url: string (image URL), alt?: string, caption?: string }",
  issuesGrid: "{ heading?: string, intro?: string, items: [{title, body}] (max 12) }",
  volunteerForm: "{ heading?: string, intro?: string }  (the signup form itself is automatic)",
  newsletterSignup:
    "{ heading?: string, intro?: string, buttonLabel?: string }  (the email-newsletter signup form is automatic; visitors double opt-in via a confirmation email)",
  cta: "{ heading?: string, text?: string, buttonLabel: string, href: string }",
  endorsements: "{ heading?: string, intro?: string, items: [{name, role?, quote?}] (max 24) }",
  newsFeed:
    "{ heading?: string, intro?: string, types?: string[] subset of [press_release, op_ed, event_announcement, letter_to_editor], limit?: number }  — DYNAMIC: automatically lists the candidate's PUBLISHED AI-Communications pieces; it has no manual items.",
  pressMentions:
    "{ heading?: string, intro?: string, limit?: number }  — DYNAMIC: automatically lists APPROVED external press coverage about the candidate (managed in the Press coverage manager); it has no manual items. Use this for an 'In the news' / press-clips section.",
  newsletterArchive:
    "{ heading?: string, intro?: string, limit?: number }  — DYNAMIC: automatically lists the candidate's PUBLISHED newsletters (managed in the Newsletters manager); it has no manual items. Use this for a newsletter archive / past-issues section.",
  events: "{ heading?: string, intro?: string, items: [{title, date?, location?, description?}] (max 24) }",
  faq: "{ heading?: string, intro?: string, items: [{q, a}] (max 24) }",
}

/** Human-readable block vocabulary for the system prompt so the model produces valid props. */
export function describeBlockVocabulary(): string {
  const lines = BLOCK_ORDER.map((t) => {
    const spec = BLOCK_SPECS[t]
    return `- ${t} (${spec.tier}): ${spec.description}\n    props: ${BLOCK_PROP_SHAPES[t]}`
  })
  return lines.join("\n")
}
