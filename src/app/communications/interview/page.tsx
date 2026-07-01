import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { InterviewView } from "@/components/communications/InterviewView"
import type { InterviewData } from "@/lib/comms/interview"

export default async function InterviewPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const c = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: {
      bio: true,
      education: true,
      experience: true,
      whyRunning: true,
      coreValues: true,
      politicalLean: true,
      voiceTone: true,
      interview: true,
    },
  })
  if (!c) redirect("/onboarding")

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
