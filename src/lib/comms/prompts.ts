/**
 * Prompt engine for AI Communications.
 *
 * Ported from the archived Amplify app and extended with optional "Candidate in
 * the News" grounding: selected news items are folded into the system prompt so
 * the model paraphrases what actually happened rather than inventing specifics.
 */

export type ContentType =
  | "press_release"
  | "email"
  | "fundraising_email"
  | "letter_to_editor"
  | "social_facebook"
  | "social_twitter"
  | "social_instagram"
  | "talking_points"
  | "speech"
  | "op_ed"
  | "flyer"
  | "event_announcement"

export const CONTENT_TYPES: ContentType[] = [
  "press_release",
  "email",
  "fundraising_email",
  "letter_to_editor",
  "social_facebook",
  "social_twitter",
  "social_instagram",
  "talking_points",
  "speech",
  "op_ed",
  "flyer",
  "event_announcement",
]

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  press_release: "Press Release",
  email: "Supporter Letter",
  fundraising_email: "Fundraising Email",
  letter_to_editor: "Letter to the Editor",
  social_facebook: "Facebook Post",
  social_twitter: "X / Twitter Post",
  social_instagram: "Instagram Caption",
  talking_points: "Talking Points",
  speech: "Speech",
  op_ed: "Op-Ed",
  flyer: "Flyer / Handout",
  event_announcement: "Event Announcement",
}

export const CONTENT_TYPE_ICONS: Record<ContentType, string> = {
  press_release: "📰",
  email: "✉️",
  fundraising_email: "💸",
  letter_to_editor: "🖊️",
  social_facebook: "👍",
  social_twitter: "🐦",
  social_instagram: "📸",
  talking_points: "🎯",
  speech: "🎤",
  op_ed: "✍️",
  flyer: "📄",
  event_announcement: "📅",
}

export function isContentType(value: string): value is ContentType {
  return (CONTENT_TYPES as string[]).includes(value)
}

// ─── Media grouping (drives the sub-pages) ───────────────────────────────────

export type Medium = "speeches" | "letters" | "social" | "print"

export const MEDIA: Medium[] = ["speeches", "letters", "social", "print"]

export const MEDIUM_LABELS: Record<Medium, string> = {
  speeches: "Speeches",
  letters: "Letters",
  social: "Social Media",
  print: "Print Media",
}

export const MEDIUM_TYPES: Record<Medium, ContentType[]> = {
  speeches: ["speech", "talking_points"],
  letters: ["email", "fundraising_email", "letter_to_editor"],
  social: ["social_facebook", "social_twitter", "social_instagram"],
  print: ["press_release", "op_ed", "flyer", "event_announcement"],
}

export function isMedium(value: string): value is Medium {
  return (MEDIA as string[]).includes(value)
}

export function mediumForType(type: ContentType): Medium {
  for (const m of MEDIA) if (MEDIUM_TYPES[m].includes(type)) return m
  return "print"
}

export interface PromptCampaign {
  candidateName: string
  office: string
  district: string | null
  party: string | null
  tagline: string | null
  bio: string | null
  // Candidate knowledge from the guided interview (all optional).
  whyRunning?: string | null
  experience?: string | null
  education?: string | null
  coreValues?: string | null
  politicalLean?: string | null
  voiceTone?: string | null
}

// The grounding for one generation, already scope-filtered (general items + the
// selected topic's items) and split by context type.
export interface ContextBundle {
  positions: { title: string | null; body: string; keyPoints: string[] }[]
  notes: { title: string | null; body: string }[]
  references: { title: string | null; body: string; source: string | null; url: string | null }[]
}

export function buildSystemPrompt(campaign: PromptCampaign, ctx: ContextBundle): string {
  const location = campaign.district ? ` in ${campaign.district}` : ""
  const party = campaign.party ? ` as a ${campaign.party} candidate` : ""

  // Candidate knowledge from the interview — the more we know, the more the copy
  // sounds like the actual candidate rather than a generic politician.
  const knowledge = [
    field("Why running", campaign.whyRunning),
    field("Background & experience", campaign.experience),
    field("Education", campaign.education),
    field("Core values", campaign.coreValues),
    field("Political lean & positions", campaign.politicalLean),
  ]
    .filter(Boolean)
    .join("\n")

  const voiceGuidance = campaign.voiceTone
    ? ` Match this preferred tone: ${campaign.voiceTone}.`
    : ""

  const positionsBlock = ctx.positions.length
    ? `\n\nPositions on key issues (align every message with these):\n${ctx.positions
        .map((p, i) => {
          const points = p.keyPoints.length
            ? `\n   Talking points:\n${p.keyPoints.map((k) => `   - ${k}`).join("\n")}`
            : ""
          return `${i + 1}. ${p.title ?? "Position"}\n   Stance: ${p.body}${points}`
        })
        .join("\n\n")}`
    : ""

  const notesBlock = ctx.notes.length
    ? `\n\nCampaign context:\n${ctx.notes
        .map((n) => (n.title ? `- ${n.title}: ${n.body}` : `- ${n.body}`))
        .join("\n")}`
    : ""

  const refsBlock = ctx.references.length
    ? `\n\nNews & references (use these real facts; do not contradict or embellish them):\n${ctx.references
        .map((r) => {
          const src = r.source ? ` (${r.source})` : ""
          const body = r.body ? `: ${r.body}` : ""
          return `- ${r.title ?? "Reference"}${src}${body}`
        })
        .join("\n")}`
    : ""

  return `You are a campaign communications assistant for ${campaign.candidateName}, running for ${campaign.office}${location}${party}.

${campaign.tagline ? `Campaign tagline: "${campaign.tagline}"\n` : ""}${campaign.bio ? `\nCandidate background: ${campaign.bio}\n` : ""}${knowledge ? `\nAbout the candidate:\n${knowledge}\n` : ""}${positionsBlock}${notesBlock}${refsBlock}

Write in ${campaign.candidateName}'s authentic voice — direct, specific, and focused on constituents. Use the positions, values, and context above.${voiceGuidance} Never invent statistics or facts not present in this profile or the provided context.`
}

/** Split scope-filtered ContextItems into the typed bundle the prompt expects. */
export function toContextBundle(
  items: {
    type: string
    title: string | null
    body: string
    keyPoints: string[]
    url: string | null
    source: string | null
  }[]
): ContextBundle {
  return {
    positions: items
      .filter((i) => i.type === "position")
      .map((i) => ({ title: i.title, body: i.body, keyPoints: i.keyPoints })),
    notes: items.filter((i) => i.type === "note").map((i) => ({ title: i.title, body: i.body })),
    references: items
      .filter((i) => i.type === "reference")
      .map((i) => ({ title: i.title, body: i.body, source: i.source, url: i.url })),
  }
}

function field(label: string, value: string | null | undefined): string {
  return value && value.trim() ? `- ${label}: ${value.trim()}` : ""
}

/**
 * Build the instruction for a revision pass: the model rewrites the human's
 * CURRENT draft per their notes — preserving everything that already works, so
 * hand-edits are never thrown away. Uses the same system prompt (voice,
 * positions, grounding) as generation.
 */
export function buildRevisionPrompt(
  type: ContentType,
  currentDraft: string,
  notes: string
): string {
  const label = CONTENT_TYPE_LABELS[type].toLowerCase()
  return `Here is the current draft of the ${label}:

"""
${currentDraft}
"""

Revise it according to these notes:
${notes}

Return ONLY the revised ${label} — no preamble, no explanation, no commentary. Preserve everything that already works and the candidate's voice; change only what the notes ask for.`
}

export function buildUserPrompt(
  type: ContentType,
  candidateName: string,
  issueTopic: string,
  additionalContext: string
): string {
  const ctx = additionalContext ? `\nAdditional context: ${additionalContext}` : ""

  switch (type) {
    case "press_release":
      return `Write a press release for ${candidateName}'s campaign.

Topic: ${issueTopic}${ctx}

Use this exact format:
FOR IMMEDIATE RELEASE

[Headline in title case]

[City, State] — [Strong opening sentence with the most newsworthy element.]

[Body paragraph 1: expand on the news with supporting detail]

"[Authentic quote from ${candidateName} that sounds personal and direct]"

[Body paragraph 2: context and additional support]

[Closing paragraph with a forward-looking statement or call to action]

###

About ${candidateName}: [One-sentence boilerplate about the candidacy]`

    case "email":
      return `Write a supporter letter/email from ${candidateName}.

Topic: ${issueTopic}${ctx}

Format:
Subject: [Compelling subject line]

[First name],

[Opening that immediately connects with the reader on this issue — 2-3 sentences]

[Main content — 2-3 paragraphs with specific detail and personal connection]

[Clear call to action — volunteer, share, attend, learn more]

[Signature]
${candidateName}`

    case "fundraising_email":
      return `Write a fundraising email from ${candidateName} asking supporters to donate.

Topic: ${issueTopic}${ctx}

Format:
Subject: [Urgent, compelling subject line]

[First name],

[Hook — why this moment matters, 2-3 sentences with genuine stakes]

[Main ask — connect the issue to why a contribution matters now; be specific and personal]

[Clear donation call to action with suggested amounts and a deadline or goal]

[Signature]
${candidateName}

P.S. [A short urgent reinforcement of the ask.]`

    case "letter_to_editor":
      return `Write a letter to the editor from ${candidateName} for a local newspaper.

Topic: ${issueTopic}${ctx}

Guidelines: 200-300 words. First person. Open by referencing the issue or a recent article. Make one clear argument with a concrete local example. Respectful but firm in tone. Close with the candidate's name and the office they seek.`

    case "social_facebook":
      return `Write a Facebook post for ${candidateName}'s campaign page.

Topic: ${issueTopic}${ctx}

Guidelines: 150-300 words. Conversational and personal. Can include a question to spark engagement. End with a relevant call to action. Include 2-3 relevant hashtags at the end.`

    case "social_twitter":
      return `Write a post for ${candidateName}'s X/Twitter account.

Topic: ${issueTopic}${ctx}

Guidelines: Must be 280 characters or fewer. Punchy and direct. Can include 1-2 hashtags. Every word must earn its place.`

    case "social_instagram":
      return `Write an Instagram caption for ${candidateName}'s campaign.

Topic: ${issueTopic}${ctx}

Guidelines: Start with a strong hook sentence. 100-200 words of caption text. End with a call to action. Then on a new line, add 5-8 relevant hashtags.`

    case "talking_points":
      return `Write talking points for ${candidateName} on the following topic.

Topic: ${issueTopic}${ctx}

Format as 5-8 crisp bullet points that can be delivered verbally. Each point should be one or two sentences — memorable and concrete. Start with the strongest point. End with a closing statement or call to action.`

    case "op_ed":
      return `Write an op-ed from ${candidateName}'s perspective.

Topic: ${issueTopic}${ctx}

Guidelines: 600-800 words. First-person voice. Open with a compelling anecdote or arresting fact. Build the argument with specific evidence. Anticipate and address the counterargument. Close with a clear call to action. Suitable for submission to a local newspaper.`

    case "speech":
      return `Write a speech for ${candidateName} to deliver.

Topic: ${issueTopic}${ctx}

Guidelines: 400-700 words written for the ear, not the page — short sentences, natural cadence, room to breathe. Open with a hook that connects with the audience. Make 2-3 main points, each tied to the candidate's values and a concrete local example. Build to an emotional, memorable close with a clear call to action. Mark applause/pause beats sparingly with [pause] where natural.`

    case "flyer":
      return `Write the copy for a campaign flyer/handout for ${candidateName}.

Topic: ${issueTopic}${ctx}

Provide, clearly labeled:
- HEADLINE: a short, punchy headline (under 8 words)
- SUBHEAD: one supporting line
- BODY: 3-4 scannable benefit bullets (each a few words to one short sentence)
- CANDIDATE: ${candidateName}, [office]
- CALL TO ACTION: vote date / how to get involved
Keep it tight and skimmable — this is print someone reads in seconds.`

    case "event_announcement":
      return `Write an event announcement for ${candidateName}'s campaign.

Topic/Event: ${issueTopic}${ctx}

Include: A compelling headline, what the event is, why people should attend, date/time/location placeholders if not provided, RSVP or registration call to action. Write versions suitable for both email and social media.`
  }
}
