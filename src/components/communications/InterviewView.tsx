"use client"

import { useRouter } from "next/navigation"
import { InterviewWizard } from "./InterviewWizard"
import type { ProfileDTO } from "./shared"

export function InterviewView({ profile }: { profile: ProfileDTO }) {
  const router = useRouter()
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Candidate interview</h1>
        <p className="mt-1 text-muted-foreground">
          Tell us about yourself. This grounds every communication we write.
        </p>
      </div>
      <InterviewWizard profile={profile} onExit={() => router.push("/communications")} />
    </div>
  )
}
