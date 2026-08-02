import { DEFAULT_TEMPLATE, type NewsletterTemplate } from "./template"

// Built-in newsletter presets — a starting point bundling branding (theme/header/
// footer) + a block layout. Users can also save their own (NewsletterPreset model).
// Pure module.

export interface NewsletterPresetDef {
  key: string
  name: string
  description: string
  template: NewsletterTemplate
  blocks: { type: string; props: Record<string, unknown> }[]
}

export const BUILTIN_PRESETS: NewsletterPresetDef[] = [
  {
    key: "update",
    name: "Monthly Update",
    description: "A warm supporter update with a get-involved ask.",
    template: DEFAULT_TEMPLATE,
    blocks: [
      { type: "text", props: { body: "Hi friends,\n\nThank you for being part of this campaign. Here's the latest on what we've been up to." } },
      { type: "heading", props: { text: "What's new" } },
      { type: "text", props: { body: "Share your update here — an event recap, a new endorsement, a milestone we just hit." } },
      { type: "button", props: { label: "Get involved", href: "#", align: "center" } },
    ],
  },
  {
    key: "fundraising",
    name: "Fundraising Appeal",
    description: "An urgent ask built around a Donate button.",
    template: { ...DEFAULT_TEMPLATE, theme: { ...DEFAULT_TEMPLATE.theme, primaryColor: "#7f1d1d", accentColor: "#b91c1c" } },
    blocks: [
      { type: "text", props: { body: "We have an important deadline coming up, and I need your help to meet it." } },
      { type: "heading", props: { text: "Can you chip in today?" } },
      { type: "text", props: { body: "Every dollar goes directly to reaching more voters. Whatever you can give makes a real difference." } },
      { type: "button", props: { label: "Donate now", href: "#", align: "center" } },
    ],
  },
  {
    key: "event",
    name: "Event Invite",
    description: "An invitation with the details and an RSVP.",
    template: { ...DEFAULT_TEMPLATE, theme: { ...DEFAULT_TEMPLATE.theme, fontFamily: "serif" } },
    blocks: [
      { type: "heading", props: { text: "You're invited" } },
      { type: "text", props: { body: "Join us for an evening with the campaign. Details below — we'd love to see you there." } },
      { type: "text", props: { body: "When: [date & time]\nWhere: [location]" } },
      { type: "button", props: { label: "RSVP", href: "#", align: "center" } },
    ],
  },
]

export function builtinPreset(key: string): NewsletterPresetDef | undefined {
  return BUILTIN_PRESETS.find((p) => p.key === key)
}
