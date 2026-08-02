import type {
  NlBlock,
  HeadingProps,
  TextProps,
  ImageProps,
  ButtonProps,
  SpacerProps,
  TwoColumnProps,
  SocialProps,
  QuoteProps,
} from "./blocks"
import { parseBlocks } from "./blocks"
import { parseTemplate, FONT_STACKS, type NewsletterTemplate } from "./template"

// Email-safe renderer: template + content blocks → a 600px, table-based, fully
// inline-CSS HTML email. Deliberately conservative (no flexbox/grid, explicit
// widths) so it renders in Outlook/Gmail/etc. Used for BOTH the editor preview
// (in an iframe) and the actual send.

export interface EmailRenderCtx {
  subject: string
  candidateName: string
  committeeName: string | null
  campaignId: string
  mailing: {
    street: string | null
    street2: string | null
    city: string | null
    state: string | null
    zip: string | null
  }
  /** Per-recipient unsubscribe URL. Preview passes a placeholder "#". */
  unsubscribeUrl: string
  /** Absolute headshot URL, when the header shows it and one exists. */
  headshotUrl?: string | null
  /** Origin used to absolutize relative image srcs (e.g. /api/newsletter/image/…),
   *  since email clients need absolute URLs. Send passes the prod URL; the editor
   *  preview passes window.location.origin. */
  baseUrl: string
}

/** Relative internal paths → absolute (email clients need absolute image URLs). */
function absolutize(src: string, baseUrl: string): string {
  return src.startsWith("/") ? `${baseUrl}${src}` : src
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function composeAddress(m: EmailRenderCtx["mailing"]): string {
  const line1 = [m.street, m.street2].map((s) => s?.trim()).filter(Boolean).join(", ")
  const cityStateZip = [m.city?.trim(), [m.state?.trim(), m.zip?.trim()].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ")
  return [line1, cityStateZip].filter(Boolean).join(", ")
}

/** Plain-text (blank lines = paragraphs) → escaped <p> HTML. */
function paragraphsHtml(body: string): string {
  return body
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(
      (para) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1a1a2e">${esc(para).replace(/\n/g, "<br>")}</p>`
    )
    .join("")
}

/** One content block → a table row (`<tr><td>…`). */
function renderBlock(block: NlBlock, tpl: NewsletterTemplate, baseUrl: string): string {
  const pad = "padding:10px 28px"
  switch (block.type) {
    case "heading": {
      const p = block.props as HeadingProps
      if (!p.text) return ""
      return `<tr><td style="${pad}"><h2 style="margin:0;font-size:22px;line-height:1.3;color:${tpl.theme.primaryColor}">${esc(p.text)}</h2></td></tr>`
    }
    case "text": {
      const p = block.props as TextProps
      const paras = paragraphsHtml(p.body)
      return paras ? `<tr><td style="${pad}">${paras}</td></tr>` : ""
    }
    case "spacer": {
      const p = block.props as SpacerProps
      const h = p.size === "small" ? 12 : p.size === "large" ? 48 : 28
      return `<tr><td style="height:${h}px;line-height:${h}px;font-size:0">&nbsp;</td></tr>`
    }
    case "twoColumn": {
      const p = block.props as TwoColumnProps
      if (!p.left.trim() && !p.right.trim()) return ""
      return `<tr><td style="${pad}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td class="nl-col" width="50%" valign="top" style="padding-right:10px">${paragraphsHtml(p.left)}</td>
        <td class="nl-col" width="50%" valign="top" style="padding-left:10px">${paragraphsHtml(p.right)}</td>
      </tr></table></td></tr>`
    }
    case "social": {
      const p = block.props as SocialProps
      const links: [string, string][] = [
        ["Facebook", p.facebook],
        ["X", p.x],
        ["Instagram", p.instagram],
        ["YouTube", p.youtube],
        ["Website", p.website],
      ].filter(([, url]) => url) as [string, string][]
      if (links.length === 0) return ""
      const inner = links
        .map(
          ([label, url]) =>
            `<a href="${esc(url)}" target="_blank" style="color:${tpl.theme.primaryColor};text-decoration:none;font-size:14px;font-weight:600">${label}</a>`
        )
        .join(`<span style="color:#c4c4d0">&nbsp;&middot;&nbsp;</span>`)
      return `<tr><td style="${pad}" align="center">${inner}</td></tr>`
    }
    case "quote": {
      const p = block.props as QuoteProps
      if (!p.text) return ""
      const attr = p.attribution
        ? `<p style="margin:8px 0 0;font-size:13px;color:#8a8a99">&mdash; ${esc(p.attribution)}</p>`
        : ""
      return `<tr><td style="${pad}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-left:3px solid ${tpl.theme.accentColor};padding:4px 0 4px 16px"><p style="margin:0;font-size:17px;line-height:1.5;font-style:italic;color:#1a1a2e">${esc(p.text)}</p>${attr}</td></tr></table></td></tr>`
    }
    case "image": {
      const p = block.props as ImageProps
      if (!p.src) return ""
      const src = absolutize(p.src, baseUrl)
      const img = `<img src="${esc(src)}" alt="${esc(p.alt ?? "")}" width="544" style="display:block;width:100%;max-width:544px;height:auto;border:0;border-radius:8px" />`
      const inner = p.href ? `<a href="${esc(p.href)}" target="_blank">${img}</a>` : img
      return `<tr><td style="${pad}">${inner}</td></tr>`
    }
    case "button": {
      const p = block.props as ButtonProps
      if (!p.label) return ""
      const align = p.align ?? "center"
      return `<tr><td style="${pad}" align="${align}"><a href="${esc(p.href)}" target="_blank" style="display:inline-block;background:${tpl.theme.accentColor};color:#0f2044;font-weight:600;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:8px">${esc(p.label)}</a></td></tr>`
    }
    case "divider":
      return `<tr><td style="padding:6px 28px"><hr style="border:0;border-top:1px solid #e5e7eb;margin:0" /></td></tr>`
    default:
      return ""
  }
}

function renderHeader(tpl: NewsletterTemplate, ctx: EmailRenderCtx): string {
  const h = tpl.header
  if (!h.showLogo && !h.showHeadshot) return ""
  const logo = h.logoText || ctx.committeeName || ctx.candidateName
  const headshot =
    h.showHeadshot && ctx.headshotUrl
      ? `<img src="${esc(ctx.headshotUrl)}" alt="" width="44" height="44" style="display:block;width:44px;height:44px;border-radius:9999px;object-fit:cover;border:0" />`
      : ""
  return `<tr><td style="padding:24px 28px;border-bottom:1px solid #eef0f4">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${headshot ? `<td width="52" valign="middle">${headshot}</td>` : ""}
      <td valign="middle">${h.showLogo ? `<span style="font-size:18px;font-weight:700;color:${tpl.theme.primaryColor}">${esc(logo)}</span>` : ""}</td>
    </tr></table>
  </td></tr>`
}

/** The issue title, printed at the top of the body (empty when no title set). */
function renderTitle(tpl: NewsletterTemplate, ctx: EmailRenderCtx): string {
  const t = ctx.subject.trim()
  if (!t) return ""
  return `<tr><td style="padding:24px 28px 4px"><h1 style="margin:0;font-size:26px;line-height:1.25;font-weight:700;color:${tpl.theme.primaryColor}">${esc(t)}</h1></td></tr>`
}

function renderFooter(tpl: NewsletterTemplate, ctx: EmailRenderCtx): string {
  const paidFor = ctx.committeeName ? `Paid for by ${esc(ctx.committeeName)}. ` : ""
  const addr = esc(composeAddress(ctx.mailing))
  const signoff = tpl.footer.signoff
    ? `<p style="margin:0 0 12px;font-size:14px;color:#4a4a5a">${esc(tpl.footer.signoff)}</p>`
    : ""
  return `<tr><td style="padding:20px 28px 28px;border-top:1px solid #eef0f4">
    ${signoff}
    <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#8a8a99">${paidFor}${addr}</p>
    <p style="margin:0;font-size:12px;line-height:1.5;color:#8a8a99">
      You're receiving this because you subscribed to ${esc(ctx.candidateName)}'s newsletter.
      <a href="${esc(ctx.unsubscribeUrl)}" style="color:${tpl.theme.primaryColor}">Unsubscribe</a>.
    </p>
  </td></tr>`
}

/** Render a full newsletter email from a template + content blocks. */
export function renderNewsletterEmail(
  rawTemplate: unknown,
  rawBlocks: unknown,
  ctx: EmailRenderCtx
): string {
  const tpl = parseTemplate(rawTemplate)
  const blocks = parseBlocks(rawBlocks)
  const font = FONT_STACKS[tpl.theme.fontFamily]
  const body = blocks.map((b) => renderBlock(b, tpl, ctx.baseUrl)).join("")

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>${esc(ctx.subject)}</title>
<style>@media only screen and (max-width:480px){.nl-col{display:block!important;width:100%!important;padding:0!important}}</style></head>
<body style="margin:0;padding:0;background:${tpl.theme.contentBg};font-family:${font}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${tpl.theme.contentBg}">
  <tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">
      ${renderHeader(tpl, ctx)}
      ${renderTitle(tpl, ctx)}
      ${body}
      ${renderFooter(tpl, ctx)}
    </table>
  </td></tr>
</table>
</body></html>`
}

/** True only when the address is complete enough for CAN-SPAM. */
export function hasMailingAddress(m: EmailRenderCtx["mailing"]): boolean {
  return Boolean(m.street?.trim() && m.city?.trim() && m.state?.trim() && m.zip?.trim())
}
