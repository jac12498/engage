"use client"

import { useRouter } from "next/navigation"
import { InterviewWizard } from "./InterviewWizard"
import type { ProfileDTO } from "./shared"

export function InterviewView({
  profile,
  scope = "candidate",
}: {
  profile: ProfileDTO
  /** "committee" for a multi-candidate committee (its shared voice), else "candidate". */
  scope?: "committee" | "candidate"
}) {
  const router = useRouter()
  const isCommittee = scope === "committee"
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">
          {isCommittee ? "Committee voice & interview" : "Candidate interview"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isCommittee
            ? "Tell us about the committee — its voice, values, and the positions it stands for. This grounds every communication we write."
            : "Tell us about yourself. This grounds every communication we write."}
        </p>
      </div>
      <InterviewWizard profile={profile} scope={scope} onExit={() => router.push("/communications")} />
    </div>
  )
}
