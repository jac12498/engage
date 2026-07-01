import type { InterviewData } from "@/lib/comms/interview"

export type GenDTO = {
  id: string
  type: string
  title: string | null
  content: string
  model: string
  newsHook: string | null
  createdAt: string
}
export type TopicDTO = {
  id: string
  title: string
  keyMessage: string | null
  targetAudience: string | null
  occasion: string | null
  talkingPoints: string[]
}
export type ContextDTO = {
  id: string
  type: string // note | position | reference
  title: string | null
  body: string
  keyPoints: string[]
  url: string | null
  source: string | null
  refType: string | null // reference: "webpage" | "document"
  topicId: string | null
}
export type ProfileDTO = {
  bio: string | null
  education: string | null
  experience: string | null
  whyRunning: string | null
  coreValues: string | null
  politicalLean: string | null
  voiceTone: string | null
  interview: InterviewData | null
}

export const inputCls =
  "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-[#1a1a2e] outline-none transition-colors focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"
