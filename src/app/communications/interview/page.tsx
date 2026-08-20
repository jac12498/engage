import { requireActiveCampaign } from "@/lib/context"
import { InterviewView } from "@/components/communications/InterviewView"
import type { InterviewData } from "@/lib/comms/interview"

export default async function InterviewPage() {
  const { candidate: c } = await requireActiveCampaign()

  return (
    <InterviewView
      profile={{
        bio: c.bio,
        education: c.education,
        experience: c.experience,
        whyRunning: c.whyRunning,
        coreValues: c.coreValues,
        politicalLean: c.politicalLean,
        voiceTone: c.voiceTone,
        interview: (c.interview as InterviewData | null) ?? null,
      }}
    />
  )
}
