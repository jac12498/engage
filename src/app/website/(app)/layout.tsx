import { redirect } from "next/navigation"
import { AppShell } from "@/components/AppShell"
import { requireActiveCampaign, campaignProfile } from "@/lib/context"
import { moduleSetupRequirement } from "@/lib/moduleStatus"
import { ModuleSetupGate } from "@/components/ModuleSetupGate"

export const metadata = { title: "Candidate Website · Engage" }

export default async function WebsiteLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireActiveCampaign()
  if (!ctx.permissions.has("candidate-websites:read")) redirect("/dashboard")
  const setup = moduleSetupRequirement("candidate-websites", campaignProfile(ctx.candidate, ctx.campaign))
  return (
    <AppShell>
      {setup ? <ModuleSetupGate moduleName="your Candidate Website" requirement={setup} /> : children}
    </AppShell>
  )
}
