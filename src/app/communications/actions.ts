"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"
import type { PermissionKey } from "@/lib/permissions"
import { buildUserPrompt, isContentType } from "@/lib/comms/prompts"
import { composeLeanSummary, type InterviewData } from "@/lib/comms/interview"

export interface SaveGenerationInput {
  /** When set, update this existing generation (and replace its version chain). */
  id?: string
  type: string
  medium?: string | null
  topicId?: string | null
  title?: string | null
  newsHook?: string | null
  topicLabel?: string | null // human topic label, for the stored prompt record
  model: string
  content: string
  /** The full refine history, oldest first. v1 = original (revisionNote null). */
  versions?: { content: string; revisionNote: string | null; model: string }[]
}

export type SaveResult = { ok: true; id: string } | { ok: false; error: string }

/** Persist a (possibly edited) generation the user chose to keep. */
export async function saveGeneration(input: SaveGenerationInput): Promise<SaveResult> {
  if (!isContentType(input.type)) return { ok: false, error: "Invalid content type." }
  if (!input.content?.trim()) return { ok: false, error: "There's nothing to save yet." }

  const ctx = await getActiveContext()
  const savePerm: PermissionKey = input.id ? "ai-communications:update" : "ai-communications:create"
  if (!ctx || !ctx.permissions.has(savePerm)) {
    return { ok: false, error: "You don't have permission to save communications." }
  }
  const { campaign, candidate } = ctx
  if (!campaign || !candidate) return { ok: false, error: "No campaign found." }

  // Reconstruct the instruction for a faithful record of what produced this.
  const topic = input.topicLabel || input.newsHook || ""
  const prompt = buildUserPrompt(input.type, candidate.candidateName, topic, "")

  // Persist the refine history. Fall back to a single v1 if none was supplied.
  const versions =
    input.versions && input.versions.length > 0
      ? input.versions
      : [{ content: input.content, revisionNote: null, model: input.model }]

  const versionCreate = versions.map((v, i) => ({
    versionNo: i + 1,
    content: v.content,
    revisionNote: v.revisionNote,
    model: v.model,
  }))

  const fields = {
    type: input.type,
    medium: input.medium ?? null,
    topicId: input.topicId ?? null,
    title: input.title?.trim() || null,
    newsHook: input.newsHook?.trim() || null,
    model: input.model,
    prompt,
    content: input.content,
  }

  // Update an existing piece: replace its version chain with the current one.
  if (input.id) {
    const existing = await prisma.generation.findFirst({
      where: { id: input.id, campaignId: campaign.id },
      select: { id: true },
    })
    if (!existing) return { ok: false, error: "That draft could not be found." }

    await prisma.$transaction([
      prisma.generationVersion.deleteMany({ where: { generationId: input.id } }),
      prisma.generation.update({
        where: { id: input.id },
        data: { ...fields, versions: { create: versionCreate } },
      }),
    ])
    revalidatePath("/communications")
    return { ok: true, id: input.id }
  }

  const gen = await prisma.generation.create({
    data: { campaignId: campaign.id, ...fields, versions: { create: versionCreate } },
  })

  revalidatePath("/communications")
  return { ok: true, id: gen.id }
}

/** Load a saved generation with its version chain, to continue refining. */
export async function getGenerationForEdit(id: string): Promise<
  | {
      ok: true
      generation: {
        id: string
        type: string
        medium: string | null
        title: string | null
        topicId: string | null
        newsHook: string | null
        model: string
        content: string
        versions: { content: string; revisionNote: string | null; model: string }[]
      }
    }
  | { ok: false; error: string }
> {
  const campaignId = await requireCampaignId("ai-communications:update")
  if (!campaignId) return { ok: false, error: "Not signed in." }

  const g = await prisma.generation.findFirst({
    where: { id, campaignId },
    include: { versions: { orderBy: { versionNo: "asc" } } },
  })
  if (!g) return { ok: false, error: "Draft not found." }

  return {
    ok: true,
    generation: {
      id: g.id,
      type: g.type,
      medium: g.medium,
      title: g.title,
      topicId: g.topicId,
      newsHook: g.newsHook,
      model: g.model,
      content: g.content,
      versions: g.versions.map((v) => ({
        content: v.content,
        revisionNote: v.revisionNote,
        model: v.model,
      })),
    },
  }
}

export async function deleteGeneration(id: string): Promise<{ ok: boolean }> {
  const campaignId = await requireCampaignId("ai-communications:update")
  if (!campaignId) return { ok: false }

  // Scope the delete to the active campaign.
  await prisma.generation.deleteMany({ where: { id, campaignId } })
  revalidatePath("/communications")
  return { ok: true }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requireCampaignId(perm: PermissionKey): Promise<string | null> {
  const ctx = await getActiveContext()
  if (!ctx?.campaign) return null
  if (!ctx.permissions.has(perm)) return null
  return ctx.campaign.id
}

/** The active committee id — grounding, topics, and context all live at the committee. */
async function requireCommitteeId(perm: PermissionKey): Promise<string | null> {
  const ctx = await getActiveContext()
  if (!ctx) return null
  if (!ctx.permissions.has(perm)) return null
  return ctx.committee.id
}

// ─── Committee grounding: interview / voice profile ──────────────────────────

/** Free-text profile fields the interview wizard can update (any subset). */
export interface ProfileInput {
  bio?: string
  education?: string
  experience?: string
  whyRunning?: string
  coreValues?: string
  voiceTone?: string
}

const PROFILE_KEYS: (keyof ProfileInput)[] = [
  "bio",
  "education",
  "experience",
  "whyRunning",
  "coreValues",
  "voiceTone",
]

export async function updateCampaignProfile(
  input: ProfileInput
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getActiveContext()
  if (!ctx?.candidate || !ctx.permissions.has("ai-communications:update")) {
    return { ok: false, error: "Not signed in." }
  }

  // Whitelist + normalize (empty string → null). `bio` is candidate identity (the
  // website renders it); the rest is committee-level grounding.
  const candidateData: Record<string, string | null> = {}
  const committeeData: Record<string, string | null> = {}
  for (const key of PROFILE_KEYS) {
    if (input[key] === undefined) continue
    const value = input[key]?.trim() || null
    if (key === "bio") candidateData[key] = value
    else committeeData[key] = value
  }

  const ops = []
  if (Object.keys(candidateData).length)
    ops.push(prisma.candidate.update({ where: { id: ctx.candidate.id }, data: candidateData }))
  if (Object.keys(committeeData).length)
    ops.push(prisma.committee.update({ where: { id: ctx.committee.id }, data: committeeData }))
  if (ops.length) await prisma.$transaction(ops)

  revalidatePath("/communications")
  return { ok: true }
}

/**
 * Save the political-lean questionnaire. Stores the raw answers as JSON and
 * derives a readable `politicalLean` summary for the prompt; optional values text
 * updates `coreValues`.
 */
export async function saveInterview(input: {
  data: InterviewData
  coreValues?: string
}): Promise<{ ok: boolean; error?: string }> {
  const committeeId = await requireCommitteeId("ai-communications:update")
  if (!committeeId) return { ok: false, error: "Not signed in." }

  await prisma.committee.update({
    where: { id: committeeId },
    data: {
      interview: input.data as object,
      politicalLean: composeLeanSummary(input.data) || null,
      coreValues: input.coreValues !== undefined ? input.coreValues.trim() || null : undefined,
      interviewUpdatedAt: new Date(),
    },
  })
  revalidatePath("/communications")
  return { ok: true }
}

// ─── Topics (hot topics) ─────────────────────────────────────────────────────

export interface TopicInput {
  id?: string
  title: string
  keyMessage?: string
  targetAudience?: string
  occasion?: string
  talkingPoints: string[]
}

export async function saveTopic(input: TopicInput): Promise<{ ok: boolean; error?: string }> {
  const committeeId = await requireCommitteeId("ai-communications:update")
  if (!committeeId) return { ok: false, error: "Not signed in." }
  if (!input.title.trim()) return { ok: false, error: "A title is required." }

  const data = {
    title: input.title.trim(),
    keyMessage: input.keyMessage?.trim() || null,
    targetAudience: input.targetAudience?.trim() || null,
    occasion: input.occasion?.trim() || null,
    talkingPoints: input.talkingPoints.map((p) => p.trim()).filter(Boolean),
  }

  if (input.id) {
    await prisma.topic.updateMany({ where: { id: input.id, committeeId }, data })
  } else {
    await prisma.topic.create({ data: { committeeId, ...data } })
  }

  revalidatePath("/settings/topics")
  return { ok: true }
}

export async function deleteTopic(id: string): Promise<{ ok: boolean }> {
  const committeeId = await requireCommitteeId("ai-communications:update")
  if (!committeeId) return { ok: false }
  await prisma.topic.deleteMany({ where: { id, committeeId } })
  revalidatePath("/settings/topics")
  return { ok: true }
}

// ─── Context items ───────────────────────────────────────────────────────────

export interface ContextItemInput {
  id?: string
  type?: string // note | position | reference
  title?: string
  body: string
  keyPoints?: string[] // positions only
  url?: string // references only
  source?: string // references only
  refType?: string // references only: "webpage" | "document"
  /** null / undefined = General (every generation); a topic id = topic-scoped. */
  topicId?: string | null
}

const CONTEXT_TYPES = new Set(["note", "position", "reference"])

export async function saveContextItem(
  input: ContextItemInput
): Promise<{ ok: boolean; error?: string }> {
  const committeeId = await requireCommitteeId("ai-communications:update")
  if (!committeeId) return { ok: false, error: "Not signed in." }
  if (!input.body.trim()) return { ok: false, error: "Context text is required." }

  const type = input.type && CONTEXT_TYPES.has(input.type) ? input.type : "note"

  // Validate the topic belongs to this committee (if provided).
  let topicId: string | null = null
  if (input.topicId) {
    const t = await prisma.topic.findFirst({
      where: { id: input.topicId, committeeId },
      select: { id: true },
    })
    if (!t) return { ok: false, error: "That topic could not be found." }
    topicId = t.id
  }

  const data = {
    type,
    title: input.title?.trim() || null,
    body: input.body.trim(),
    keyPoints: type === "position" ? (input.keyPoints ?? []).map((p) => p.trim()).filter(Boolean) : [],
    url: type === "reference" ? input.url?.trim() || null : null,
    source: type === "reference" ? input.source?.trim() || null : null,
    refType:
      type === "reference"
        ? ["url", "website", "document"].includes(input.refType ?? "")
          ? input.refType!
          : "url"
        : null,
    topicId,
  }

  if (input.id) {
    await prisma.contextItem.updateMany({ where: { id: input.id, committeeId }, data })
  } else {
    await prisma.contextItem.create({ data: { committeeId, ...data } })
  }

  revalidatePath("/settings/context")
  return { ok: true }
}

export async function deleteContextItem(id: string): Promise<{ ok: boolean }> {
  const committeeId = await requireCommitteeId("ai-communications:update")
  if (!committeeId) return { ok: false }
  await prisma.contextItem.deleteMany({ where: { id, committeeId } })
  revalidatePath("/settings/context")
  return { ok: true }
}
