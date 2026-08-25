import { requireActiveCampaign } from "@/lib/context"
import { allowsMultipleCandidates } from "@/lib/committeeTypes"
import { InterviewView } from "@/components/communications/InterviewView"
import type { InterviewData } from "@/lib/comms/interview"

export default async function InterviewPage() {
  const { candidate, committee } = await requireActiveCampaign()
  const scope = allowsMultipleCandidates(committee.committeeType) ? "committee" : "candidate"

  return (
    <InterviewView
      scope={scope}
      profile={{
        bio: candidate.bio, // candidate identity
        education: committee.education,
        experience: committee.experience,
        whyRunning: committee.whyRunning,
        coreValues: committee.coreValues,
        politicalLean: committee.politicalLean,
        voiceTone: committee.voiceTone,
        interview: (committee.interview as InterviewData | null) ?? null,
      }}
    />
  )
}
